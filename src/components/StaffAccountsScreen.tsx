import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Phone,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Power,
  ReceiptText,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { StaffMember, StaffRole } from '../types';
import { normalizeMobile10 } from '../utils/pinHash';

export const StaffAccountsScreen: React.FC = () => {
  const {
    activeStaff,
    staffMembers,
    bills,
    addStaffMember,
    updateStaffMember,
    changeStaffPin,
    toggleStaffActive,
    deleteStaffMember,
  } = useShop();

  // Add Staff modal/form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [newRole, setNewRole] = useState<StaffRole>('CASHIER');

  // Edit Staff modal state
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editRole, setEditRole] = useState<StaffRole>('CASHIER');
  const [editIsActive, setEditIsActive] = useState(true);

  // Change PIN modal (inside Edit Staff or direct) — NO Old PIN needed!
  const [pinTarget, setPinTarget] = useState<StaffMember | null>(null);
  const [changePinNew, setChangePinNew] = useState('');
  const [changePinConfirm, setChangePinConfirm] = useState('');
  const [showChangePin, setShowChangePin] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const todayBillsByStaffId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bill of bills) {
      if (bill.isEstimate) continue;
      if (!bill.date || !bill.date.startsWith(todayStr)) continue;
      if (bill.createdByStaffId) {
        counts.set(bill.createdByStaffId, (counts.get(bill.createdByStaffId) || 0) + 1);
      }
    }
    return counts;
  }, [bills, todayStr]);

  // Strict Owner-only screen guard
  if (activeStaff) {
    return (
      <div className="max-w-md mx-auto mt-10 rounded-3xl bg-white p-8 text-center shadow-lg border-2 border-red-200">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Only Owner Allowed</h2>
        <p className="text-xs text-slate-500 mt-1.5">
          Staff accounts and PIN settings can only be managed by the shop owner.
        </p>
      </div>
    );
  }

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenAdd = () => {
    setFormError(null);
    setNewName('');
    setNewMobile('');
    setNewPin('');
    setShowNewPin(false);
    setNewRole('CASHIER');
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanMobile = normalizeMobile10(newMobile);
    const cleanPin = newPin.replace(/\D/g, '');

    if (!newName.trim()) {
      setFormError('Please enter staff name');
      return;
    }
    if (cleanMobile.length !== 10) {
      setFormError('Mobile number must be exactly 10 digits');
      return;
    }
    if (cleanPin.length !== 4) {
      setFormError('PIN must be exactly 4 digits');
      return;
    }

    setIsBusy(true);
    try {
      const res = await addStaffMember({
        name: newName.trim(),
        mobile: cleanMobile,
        pin: cleanPin,
        role: newRole,
      });
      if (!res.ok) {
        setFormError(res.error || 'Failed to add staff');
        return;
      }
      setIsAddOpen(false);
      showToastMsg('Staff Added Successfully');
    } finally {
      setIsBusy(false);
    }
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setFormError(null);
    setPinError(null);
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditMobile(staff.mobile);
    setEditRole(staff.role);
    setEditIsActive(staff.isActive);
    setChangePinNew('');
    setChangePinConfirm('');
    setShowChangePin(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setFormError(null);

    const cleanMobile = normalizeMobile10(editMobile);
    if (!editName.trim()) {
      setFormError('Staff name is required');
      return;
    }
    if (cleanMobile.length !== 10) {
      setFormError('Mobile number must be exactly 10 digits');
      return;
    }

    setIsBusy(true);
    try {
      const res = await updateStaffMember(editingStaff.id, {
        name: editName.trim(),
        mobile: cleanMobile,
        role: editRole,
        isActive: editIsActive,
      });
      if (!res.ok) {
        setFormError(res.error || 'Could not update staff');
        return;
      }
      setEditingStaff(null);
      showToastMsg('Staff Updated Successfully');
    } finally {
      setIsBusy(false);
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = pinTarget || editingStaff;
    if (!target) return;
    setPinError(null);

    const p1 = changePinNew.replace(/\D/g, '');
    const p2 = changePinConfirm.replace(/\D/g, '');
    if (p1.length !== 4) {
      setPinError('New PIN must be 4 digits');
      return;
    }
    if (p1 !== p2) {
      setPinError('New PIN and Confirm PIN do not match');
      return;
    }

    setIsBusy(true);
    try {
      const res = await changeStaffPin(target.id, p1);
      if (!res.ok) {
        setPinError(res.error || 'Could not change PIN');
        return;
      }
      setPinTarget(null);
      setChangePinNew('');
      setChangePinConfirm('');
      showToastMsg('PIN Changed Successfully');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!confirm(`Delete staff "${staff.name}" (${staff.mobile})? They will no longer be able to login.`)) {
      return;
    }
    setIsBusy(true);
    try {
      await deleteStaffMember(staff.id);
      if (editingStaff?.id === staff.id) setEditingStaff(null);
      showToastMsg('Staff Deleted');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              OWNER ONLY
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Staff Accounts
            </h1>
            <p className="text-xs text-slate-400">
              Staff login, PIN &amp; permissions • {staffMembers.length} staff
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-slate-950 font-black text-sm shadow-md transition active:scale-95 cursor-pointer"
        >
          <UserPlus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Staff</span>
        </button>
      </div>

      {toast && (
        <div className="rounded-xl bg-emerald-600 px-4 py-3 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md">
          <Check className="h-4 w-4 stroke-[3] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Role Summary Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-3.5 border border-blue-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase">
              MANAGER
            </span>
            <span className="text-xs font-bold text-slate-900">Floor / Counter Manager</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
            Can create bills, view today&apos;s bills &amp; today&apos;s sale total, view &amp; add stock. Cannot see profit, purchase price, suppliers, settings, or delete data.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3.5 border border-emerald-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase">
              CASHIER
            </span>
            <span className="text-xs font-bold text-slate-900">Billing Counter Only</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
            Opens Billing Screen directly. Can only search items and create new bills. Stock, reports, profit, purchase prices &amp; settings are completely hidden.
          </p>
        </div>
      </div>

      {/* Staff List */}
      {staffMembers.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center border-2 border-dashed border-slate-300">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="font-black text-slate-900 text-base">No Staff Added Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add your Manager or Cashier with their 10-digit mobile number and a 4-digit PIN so they can login from the Staff Access tab without needing your Owner Code.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-black text-slate-950 shadow-sm cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add First Staff</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {staffMembers.map((staff) => {
            const todayCount = todayBillsByStaffId.get(staff.id) || 0;
            return (
              <div
                key={staff.id}
                className={`rounded-2xl bg-white p-4 border shadow-xs transition ${
                  staff.isActive ? 'border-slate-200' : 'border-red-200 bg-red-50/30 opacity-85'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-900 text-base">{staff.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          staff.role === 'MANAGER'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {staff.role}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          staff.isActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {staff.isActive ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <p className="text-xs font-mono font-bold text-slate-600 mt-1 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{staff.mobile}</span>
                    </p>
                  </div>

                  {/* Active ON/OFF Toggle */}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => toggleStaffActive(staff.id)}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-black transition cursor-pointer border ${
                      staff.isActive
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
                    }`}
                    title={staff.isActive ? 'Turn OFF to block login' : 'Turn ON to allow login'}
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>{staff.isActive ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* Today's Bills Count */}
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 flex items-center gap-1.5">
                    <ReceiptText className="h-3.5 w-3.5 text-amber-600" />
                    <span>Today&apos;s Bills Created</span>
                  </span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {todayCount}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(staff)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-3 transition cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit Staff</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPinError(null);
                      setChangePinNew('');
                      setChangePinConfirm('');
                      setShowChangePin(false);
                      setPinTarget(staff);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-black text-xs py-2 px-3 transition cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Change PIN</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDeleteStaff(staff)}
                    className="rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 p-2 transition cursor-pointer"
                    title="Delete Staff"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {isAddOpen && (
        <div className="keyboard-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-3 backdrop-blur-xs overflow-y-auto overscroll-contain">
          <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-400" />
                <h3 className="font-black text-base">Add New Staff</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 keyboard-modal-body">
              {formError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Staff Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raju Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Staff Mobile Number (10 Digit) *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  required
                  placeholder="10-digit unique mobile number"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:border-amber-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">One Mobile = One Staff across all shops</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    4-Digit PIN *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewPin((v) => !v)}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    {showNewPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>{showNewPin ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showNewPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  placeholder="Enter 4-digit PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono font-bold tracking-[0.25em] placeholder:tracking-normal text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Role *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['MANAGER', 'CASHIER'] as StaffRole[]).map((roleOpt) => (
                    <button
                      key={roleOpt}
                      type="button"
                      onClick={() => setNewRole(roleOpt)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black border transition cursor-pointer ${
                        newRole === roleOpt
                          ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {roleOpt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 py-2.5 text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>{isBusy ? 'Saving...' : 'Save Staff'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL (Includes Change PIN without Old PIN) */}
      {editingStaff && (
        <div className="keyboard-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-3 backdrop-blur-xs overflow-y-auto overscroll-contain">
          <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-amber-400" />
                <h3 className="font-black text-base">Edit Staff</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[calc(var(--vv-height,100dvh)-5rem)] sm:max-h-[82vh] overflow-y-auto overscroll-contain keyboard-modal-body">
              <form onSubmit={handleEditSubmit} className="space-y-3.5">
                {formError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Staff Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Mobile Number (10 Digit) *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono font-bold text-slate-900 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['MANAGER', 'CASHIER'] as StaffRole[]).map((roleOpt) => (
                      <button
                        key={roleOpt}
                        type="button"
                        onClick={() => setEditRole(roleOpt)}
                        className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer ${
                          editRole === roleOpt
                            ? 'bg-slate-900 text-amber-400 border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {roleOpt}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 cursor-pointer">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Account Active (Allow Login)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600 cursor-pointer"
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(editingStaff)}
                    className="rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2.5 text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 py-2.5 text-xs font-black shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>{isBusy ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>

              {/* Change PIN by Owner inside Edit Staff (NO Old PIN required) */}
              <form
                onSubmit={handleChangePinSubmit}
                className="pt-4 border-t border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Change Staff PIN (No Old PIN Needed)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowChangePin((v) => !v)}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    {showChangePin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>{showChangePin ? 'Hide' : 'Show'}</span>
                  </button>
                </div>

                {pinError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs font-bold text-red-700">
                    {pinError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      New PIN
                    </label>
                    <input
                      type={showChangePin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="4 digits"
                      value={changePinNew}
                      onChange={(e) => setChangePinNew(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold tracking-[0.2em] placeholder:tracking-normal text-slate-900 focus:border-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Confirm PIN
                    </label>
                    <input
                      type={showChangePin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="4 digits"
                      value={changePinConfirm}
                      onChange={(e) => setChangePinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold tracking-[0.2em] placeholder:tracking-normal text-slate-900 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-amber-400 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Update PIN Immediately</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* STANDALONE CHANGE PIN MODAL */}
      {pinTarget && (
        <div className="keyboard-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-3 backdrop-blur-xs overflow-y-auto overscroll-contain">
          <div className="w-full max-w-sm rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-400" />
                <h3 className="font-black text-base">Change PIN • {pinTarget.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPinTarget(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChangePinSubmit} className="p-5 space-y-3.5 keyboard-modal-body">
              <p className="text-xs text-slate-500">
                Set a new 4-digit PIN for <strong className="text-slate-800">{pinTarget.name}</strong> ({pinTarget.mobile}). Old PIN is not required and stops working immediately.
              </p>

              {pinError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs font-bold text-red-700">
                  {pinError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowChangePin((v) => !v)}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  {showChangePin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{showChangePin ? 'Hide PIN' : 'Show PIN'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  New PIN *
                </label>
                <input
                  type={showChangePin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  placeholder="Enter 4-digit New PIN"
                  value={changePinNew}
                  onChange={(e) => setChangePinNew(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono font-bold tracking-[0.25em] placeholder:tracking-normal text-slate-900 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Confirm PIN *
                </label>
                <input
                  type={showChangePin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  placeholder="Re-enter 4-digit New PIN"
                  value={changePinConfirm}
                  onChange={(e) => setChangePinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono font-bold tracking-[0.25em] placeholder:tracking-normal text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPinTarget(null)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 py-2.5 text-xs font-black shadow-md cursor-pointer"
                >
                  {isBusy ? 'Updating...' : 'Save New PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
