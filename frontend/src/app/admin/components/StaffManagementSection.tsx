"use client";

import React, { useState } from "react";

export interface StaffUser {
  id: number;
  email: string;
  fullName: string;
  phone?: string | null;
  position?: string | null;
  role: "STAFF" | "ADMIN" | "CUSTOMER";
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface Props {
  staffList: StaffUser[];
  currentUserId?: number;
  onRefresh: () => Promise<void> | void;
  showToast: (msg: string) => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

const POSITION_SUGGESTIONS = [
  "Trưởng Ca / Barista",
  "Thu Ngân Chính",
  "Barista Pha Chế",
  "Phục Vụ & Kiểm Kho",
  "Quản Lý Cửa Hàng",
  "Nhân Viên Part-time",
];

export default function StaffManagementSection({
  staffList,
  currentUserId,
  onRefresh,
  showToast,
  apiFetch,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Tự động làm mới danh sách nếu ban đầu rỗng
  React.useEffect(() => {
    if (staffList.length === 0) {
      onRefresh();
    }
  }, [staffList.length, onRefresh]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("Barista Pha Chế");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STAFF" | "ADMIN">("STAFF");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [deletingStaff, setDeletingStaff] = useState<StaffUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Lọc danh sách nhân viên
  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      s.fullName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.position?.toLowerCase().includes(q);

    const matchRole = roleFilter === "ALL" || s.role === roleFilter;
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && s.isActive) ||
      (statusFilter === "INACTIVE" && !s.isActive);

    return matchQuery && matchRole && matchStatus;
  });

  // Mở modal thêm mới
  const handleOpenCreateModal = () => {
    setEditingStaff(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setPosition("Barista Pha Chế");
    setPassword("123456");
    setRole("STAFF");
    setIsActive(true);
    setIsModalOpen(true);
  };

  // Mở modal sửa
  const handleOpenEditModal = (staff: StaffUser) => {
    setEditingStaff(staff);
    setFullName(staff.fullName || "");
    setEmail(staff.email || "");
    setPhone(staff.phone || "");
    setPosition(staff.position || "Barista Pha Chế");
    setPassword(""); // Để trống nếu không đổi pass
    setRole(staff.role === "ADMIN" ? "ADMIN" : "STAFF");
    setIsActive(staff.isActive);
    setIsModalOpen(true);
  };

  // Lưu thông tin nhân viên (Thêm mới hoặc Cập nhật)
  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast("Vui lòng nhập họ và tên nhân viên");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      showToast("Vui lòng nhập email hợp lệ");
      return;
    }
    if (!editingStaff && (!password || password.length < 6)) {
      showToast("Mật khẩu nhân viên phải có ít nhất 6 ký tự");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        // Cập nhật
        const payload: any = {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          position: position.trim(),
          role,
          isActive,
        };
        if (password.trim()) {
          payload.password = password.trim();
        }

        const res = await apiFetch(`/staff/${editingStaff.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Không thể cập nhật nhân viên");
        }

        showToast(`✅ Đã cập nhật thông tin nhân viên: ${fullName}`);
      } else {
        // Tạo mới
        const payload = {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          position: position.trim(),
          password: password.trim(),
          role,
        };

        const res = await apiFetch("/staff", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Không thể thêm nhân viên mới");
        }

        showToast(`✅ Đã thêm nhân viên mới: ${fullName}`);
      }

      setIsModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      showToast(`❌ ${err.message || "Lỗi thao tác nhân viên"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bật/tắt trạng thái hoạt động (Khóa / Mở khóa nhanh)
  const handleToggleStatus = async (staff: StaffUser) => {
    if (staff.id === currentUserId) {
      showToast("⚠️ Bạn không thể tự khóa tài khoản quản trị của chính mình!");
      return;
    }

    const nextStatus = !staff.isActive;
    try {
      const res = await apiFetch(`/staff/${staff.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể đổi trạng thái nhân viên");
      }

      showToast(
        nextStatus
          ? `🔓 Đã mở khóa tài khoản nhân viên: ${staff.fullName}`
          : `🔒 Đã tạm khóa tài khoản: ${staff.fullName}`
      );
      await onRefresh();
    } catch (err: any) {
      showToast(`❌ ${err.message || "Lỗi đổi trạng thái"}`);
    }
  };

  // Xóa nhân viên
  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    if (deletingStaff.id === currentUserId) {
      showToast("⚠️ Bạn không thể xóa tài khoản của chính mình!");
      setDeletingStaff(null);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await apiFetch(`/staff/${deletingStaff.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể xóa nhân viên");
      }

      const resData = await res.json().catch(() => ({}));
      showToast(resData.message || `Đã xóa nhân viên ${deletingStaff.fullName}`);
      setDeletingStaff(null);
      await onRefresh();
    } catch (err: any) {
      showToast(`❌ ${err.message || "Lỗi khi xóa nhân viên"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Avatar chữ cái
  const getInitials = (name: string) => {
    if (!name) return "NV";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl border border-[#E6DDD5] shadow-xs p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#9E5A2B]" />
              <h2 className="font-headline text-lg font-extrabold text-[#2C1E18]">
                👥 Quản Lý Đội Ngũ Nhân Viên &amp; Phân Công Ca Làm
              </h2>
            </div>
            <p className="text-xs text-[#7A6A5E] mt-0.5">
              Thêm, chỉnh sửa thông tin, phân quyền chức vụ và quản lý trạng thái tài khoản nhân sự
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C1810] hover:bg-[#3F2E26] text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Thêm Nhân Viên Mới</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#F0EAE3]">
          {/* Tìm kiếm */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#A8988B] text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên, email, SĐT, vị trí..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
            />
          </div>

          {/* Lọc Vai trò */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#7A6A5E] font-medium shrink-0">
              Vai trò:
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="STAFF">Nhân viên (STAFF)</option>
              <option value="ADMIN">Quản trị viên (ADMIN)</option>
            </select>
          </div>

          {/* Lọc Trạng thái */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#7A6A5E] font-medium shrink-0">
              Trạng thái:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Đã khóa / Tạm dừng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-[#E6DDD5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF6F0] border-b border-[#E6DDD5] text-[#7A6A5E] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Nhân Viên</th>
                <th className="py-3 px-4">Vị Trí &amp; Ca Làm</th>
                <th className="py-3 px-4">Liên Hệ</th>
                <th className="py-3 px-4">Vai Trò</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE3]">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#7A6A5E]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-[#C4B7AC]">
                        group_off
                      </span>
                      <p className="font-medium">Không tìm thấy nhân viên nào phù hợp</p>
                      <button
                        onClick={handleOpenCreateModal}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-[#9E5A2B] text-white text-xs font-bold hover:bg-[#78350F]"
                      >
                        + Thêm nhân viên đầu tiên
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isCurrent = staff.id === currentUserId;
                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-[#FAF6F0]/60 transition-colors"
                    >
                      {/* Cột 1: Tên & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              staff.role === "ADMIN"
                                ? "bg-[#2C1810] text-[#FEBC85]"
                                : "bg-[#FAF0E6] text-[#9E5A2B] border border-[#E6DDD5]"
                            }`}
                          >
                            {getInitials(staff.fullName)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-[#2C1E18]">
                                {staff.fullName}
                              </p>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-900 text-[10px] font-bold">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#7A6A5E] font-mono">
                              Mã NV: #{staff.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Vị trí & Chức vụ */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5EDE4] text-[#845326] font-semibold text-xs border border-[#E3D6C8]">
                          <span className="material-symbols-outlined text-[14px]">
                            badge
                          </span>
                          {staff.position || "Nhân viên"}
                        </span>
                      </td>

                      {/* Cột 3: Email & SĐT */}
                      <td className="py-3.5 px-4">
                        <p className="text-[#2C1E18] font-medium">{staff.email}</p>
                        <p className="text-[11px] text-[#7A6A5E]">
                          {staff.phone || "— Chưa cập nhật SĐT"}
                        </p>
                      </td>

                      {/* Cột 4: Vai trò */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            staff.role === "ADMIN"
                              ? "bg-purple-100 text-purple-900 border border-purple-200"
                              : "bg-blue-100 text-blue-900 border border-blue-200"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {staff.role === "ADMIN" ? "admin_panel_settings" : "badge"}
                          </span>
                          {staff.role === "ADMIN" ? "Quản Trị Viên" : "Nhân Viên"}
                        </span>
                      </td>

                      {/* Cột 5: Trạng thái & Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(staff)}
                          disabled={isCurrent}
                          title={
                            isCurrent
                              ? "Không thể khóa tài khoản của chính mình"
                              : staff.isActive
                              ? "Bấm để Tạm Khóa tài khoản"
                              : "Bấm để Mở Khóa tài khoản"
                          }
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            staff.isActive
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                              : "bg-red-100 text-red-800 hover:bg-red-200 border border-red-300"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {staff.isActive ? "check_circle" : "block"}
                          </span>
                          <span>{staff.isActive ? "Hoạt động" : "Tạm khóa"}</span>
                        </button>
                      </td>

                      {/* Cột 6: Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(staff)}
                            className="p-1.5 rounded-lg bg-[#FAF0E6] hover:bg-[#F0E2D4] text-[#9E5A2B] hover:text-[#78350F] transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin"
                          >
                            <span className="material-symbols-outlined text-[17px]">
                              edit
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => setDeletingStaff(staff)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              isCurrent
                                ? "Không thể xóa chính mình"
                                : "Xóa tài khoản nhân viên"
                            }
                          >
                            <span className="material-symbols-outlined text-[17px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh Sửa Nhân Viên */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6DDD5] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#F0EAE3] flex items-center justify-between bg-[#FAF6F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#9E5A2B] text-2xl">
                  {editingStaff ? "badge" : "person_add"}
                </span>
                <div>
                  <h3 className="font-headline text-base font-extrabold text-[#2C1E18]">
                    {editingStaff ? "Chỉnh Sửa Thông Tin Nhân Viên" : "Thêm Nhân Viên Mới"}
                  </h3>
                  <p className="text-xs text-[#7A6A5E]">
                    {editingStaff
                      ? `Cập nhật hồ sơ nhân sự #${editingStaff.id}`
                      : "Tạo tài khoản và phân quyền cho nhân viên cửa hàng"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-stone-200 text-[#7A6A5E] flex items-center justify-center cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitStaff} className="p-5 space-y-4">
              {/* Họ và tên */}
              <div>
                <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                  Họ và tên nhân viên <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Gia Thành"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD5] text-xs text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                />
              </div>

              {/* Email & SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Email đăng nhập <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nhanvien@brewlite.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD5] text-xs text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    placeholder="0901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD5] text-xs text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                  />
                </div>
              </div>

              {/* Vị trí ca làm / Chức vụ */}
              <div>
                <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                  Vị trí công việc &amp; Chức vụ <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Barista Pha Chế, Thu Ngân Chính..."
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD5] text-xs text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {POSITION_SUGGESTIONS.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setPosition(pos)}
                      className="px-2 py-0.5 rounded-md bg-[#FAF6F0] hover:bg-[#F0EAE3] text-[11px] text-[#7A6A5E] hover:text-[#2C1E18] border border-[#E6DDD5] cursor-pointer"
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                  {editingStaff
                    ? "Mật khẩu mới (Để trống nếu giữ nguyên)"
                    : "Mật khẩu khởi tạo * (Gợi ý: 123456)"}
                </label>
                <input
                  type="text"
                  placeholder={editingStaff ? "•••••• (Giữ nguyên cũ)" : "Ít nhất 6 ký tự"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD5] text-xs font-mono text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                />
              </div>

              {/* Vai trò & Trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                    Vai trò hệ thống
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD5] text-xs text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                  >
                    <option value="STAFF">Nhân Viên (STAFF) — Pha chế, KDS</option>
                    <option value="ADMIN">Quản Trị Viên (ADMIN) — Toàn quyền</option>
                  </select>
                </div>

                {editingStaff && (
                  <div>
                    <label className="block text-xs font-bold text-[#2C1E18] mb-1">
                      Trạng thái tài khoản
                    </label>
                    <select
                      value={isActive ? "ACTIVE" : "INACTIVE"}
                      onChange={(e) => setIsActive(e.target.value === "ACTIVE")}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DDD5] text-xs text-[#2C1E18] focus:outline-none focus:border-[#9E5A2B]"
                    >
                      <option value="ACTIVE">Đang hoạt động (Cho phép đăng nhập)</option>
                      <option value="INACTIVE">Tạm khóa (Chặn đăng nhập)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-[#F0EAE3] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#2C1E18] text-xs font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#2C1810] hover:bg-[#3F2E26] text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting
                    ? "Đang lưu..."
                    : editingStaff
                    ? "Lưu Thay Đổi"
                    : "Tạo Tài Khoản Nhân Viên"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Nhân Viên */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6DDD5] shadow-xl w-full max-w-sm p-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <h3 className="font-headline text-base font-extrabold text-[#2C1E18]">
              Xác Nhận Xóa Nhân Viên
            </h3>
            <p className="text-xs text-[#7A6A5E] mt-2">
              Bạn có chắc chắn muốn xóa nhân viên{" "}
              <strong className="text-[#2C1E18]">{deletingStaff.fullName}</strong>{" "}
              (Mã #{deletingStaff.id}) khỏi hệ thống?
            </p>
            <p className="text-[11px] text-[#A8988B] mt-1">
              * Nếu nhân viên đã từng pha chế đơn hàng, hệ thống sẽ tự động chuyển sang trạng thái <strong>Tạm Khóa</strong> để bảo toàn lịch sử dữ liệu.
            </p>

            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#2C1E18] text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Đang xử lý..." : "Đồng Ý Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
