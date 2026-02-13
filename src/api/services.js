import api from "./axios";

export const authService = {
  login: async (email, password) => {
    // The backend uses a specific route /auth/login
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },

  verifyOtp: async (userId, otp) => {
    const response = await api.post(`/auth/verifyotp/${userId}`, { otp });
    return response.data;
  },
};

export const adminService = {
  // Fetch all users
  getAllUsers: async (adminId, page = 1, limit = 1000) => {
    // Backend route: /admin/users/:id
    // Query params for domain/subdomain filtering supported by backend
    const response = await api.get(
      `/admin/users/${adminId}?page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  getAllUsersByDomain: async (adminId, domain, page = 1, limit = 1000) => {
    // Backend route: /admin/users/:id?domain=tech
    const response = await api.get(
      `/admin/users/${adminId}?domain=${domain}&page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  getTechUsers: async (adminId, page = 1, limit = 1000) => {
    const response = await api.get(
      `/admin/userstech/${adminId}?page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  getDesignUsers: async (adminId, page = 1, limit = 1000) => {
    const response = await api.get(
      `/admin/usersdesign/${adminId}?page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  getManagementUsers: async (adminId, page = 1, limit = 1000) => {
    const response = await api.get(
      `/admin/usersmanagement/${adminId}?page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  updateUserStatus: async (regno, statusUpdates) => {
    // Backend: /admin/updatestatus/:id (id in param seems unused in controller, but req.body has regno)
    const response = await api.put(`/admin/updatestatus/update`, {
      regno,
      ...statusUpdates,
    });
    return response.data;
  },
};
