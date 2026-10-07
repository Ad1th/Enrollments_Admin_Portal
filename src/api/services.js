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

  getQuestionsByDomain: async (domain) => {
    const response = await api.get(`/admin/questions`, { params: { domain } });
    return response.data;
  },

  createQuestion: async (fields) => {
    const response = await api.post(`/admin/questions`, fields);
    return response.data;
  },

  updateQuestion: async (key, fields) => {
    const response = await api.patch(`/admin/questions/${key}`, fields);
    return response.data;
  },

  deleteQuestion: async (key) => {
    const response = await api.delete(`/admin/questions/${key}`);
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

  getInterviewers: async () => (await api.get(`/admin/interviewers`)).data,
  createInterviewer: async (fields) => (await api.post(`/admin/interviewers`, fields)).data,
  importInterviewers: async (text) => (await api.post(`/admin/interviewers/import`, { text })).data,
  updateInterviewer: async (id, fields) => (await api.patch(`/admin/interviewers/${id}`, fields)).data,
  deleteInterviewer: async (id) => (await api.delete(`/admin/interviewers/${id}`)).data,

  getMeetings: async (params) => (await api.get(`/admin/meetings`, { params })).data,
  updateMeeting: async (id, fields) => (await api.patch(`/admin/meetings/${id}`, fields)).data,

  getOnboarding: async () => (await api.get(`/admin/settings/onboarding`)).data,
  saveOnboarding: async (value) => (await api.put(`/admin/settings/onboarding`, value)).data,
  getOffers: async (userId) => (await api.get(`/admin/offers`, { params: userId ? { userId } : {} })).data,

  previewAudience: async (filter, subject, body) => (await api.post(`/admin/comms/audience`, { filter, subject, body })).data,
  getTemplates: async () => (await api.get(`/admin/comms/templates`)).data,
  saveTemplate: async (tpl) => (await api.post(`/admin/comms/templates`, tpl)).data,
  deleteTemplate: async (id) => (await api.delete(`/admin/comms/templates/${id}`)).data,
  getCampaigns: async () => (await api.get(`/admin/comms/campaigns`)).data,
  createCampaign: async (campaign) => (await api.post(`/admin/comms/campaigns`, campaign)).data,
  sendCampaignBatch: async (id) => (await api.post(`/admin/comms/campaigns/${id}/send`)).data,
  retryCampaign: async (id) => (await api.post(`/admin/comms/campaigns/${id}/retry`)).data,

  getStats: async () => (await api.get(`/admin/stats`)).data,
};
