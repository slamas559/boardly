export const saveToken = (token) => localStorage.setItem("token", token);
export const getToken = () => localStorage.getItem("token");
export const removeToken = () => localStorage.removeItem("token");

export const isLoggedIn = () => !!getToken();
export const isLogout = () => {
  removeToken();
  window.location.href = "/login";
}
