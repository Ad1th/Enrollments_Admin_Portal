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

  getHistory: async (userId) => {
    const response = await api.get(`/admin/history/${userId}`);
    return response.data;
  },

  getQuestions: async () => {
    const response = await api.get(`/admin/questions`);
    return response.data;
  },

  updateQuestion: async (key, fields) => {
    const response = await api.patch(`/admin/questions/${key}`, fields);
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

  runAiReview: async (userId, domain, force = false) => {
    const response = await api.post(`/admin/ai-review`, { userId, domain, force });
    return response.data;
  },

  getAiReviews: async (userId) => {
    const response = await api.get(`/admin/ai-review`, { params: userId ? { userId } : {} });
    return response.data;
  },

  getSimilarity: async (params) => {
    const response = await api.get(`/admin/similarity`, { params });
    return response.data;
  },

  saveReview: async (userId, domain, score, note) => {
    const response = await api.put(`/admin/reviews`, { userId, domain, score, note });
    return response.data;
  },

  getReviews: async (userId) => {
    const response = await api.get(`/admin/reviews`, { params: userId ? { userId } : {} });
    return response.data;
  },

  getRepoReport: async (url, userId) => {
    const response = await api.get(`/admin/repo-report`, { params: { url, userId } });
    return response.data;
  },
};
