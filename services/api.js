// services/api.js
const API_URL = 'http://localhost:5000/api';

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Erreur serveur');
  }
  return data;
};

// ... auth, products existants

// Onboarding
export const onboarding = {
  getStatus: async (token) => {
    const response = await fetch(`${API_URL}/onboarding/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },
  
  step1Goal: async (token, mainGoal) => {
    const response = await fetch(`${API_URL}/onboarding/step1-goal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ mainGoal })
    });
    return handleResponse(response);
  },
  
  step2Interests: async (token, interests) => {
    const response = await fetch(`${API_URL}/onboarding/step2-interests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ interests })
    });
    return handleResponse(response);
  },
  
  step3Experience: async (token, experienceLevel) => {
    const response = await fetch(`${API_URL}/onboarding/step3-experience`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ experienceLevel })
    });
    return handleResponse(response);
  },
  
  skip: async (token) => {
    const response = await fetch(`${API_URL}/onboarding/skip`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  }
};

// Dashboard
export const dashboard = {
  get: async (token) => {
    const response = await fetch(`${API_URL}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  }
};