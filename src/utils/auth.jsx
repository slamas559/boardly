export const saveToken = (token) => localStorage.setItem("tutor_token", token);
export const getToken = () => localStorage.getItem("tutor_token");
export const removeToken = () => localStorage.removeItem("tutor_token");

export const isLoggedIn = () => !!getToken();
export const isLogout = () => {
  removeToken();
  window.location.href = "/login";
}
