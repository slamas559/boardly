export const saveToken = (token) => localStorage.setItem("tutor_token", token);
export const getToken = () => localStorage.getItem("tutor_token");
export const removeToken = () => localStorage.removeItem("tutor_token");

export const isLoggedIn = () => !!getToken();
