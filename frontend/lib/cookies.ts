export function setCookie(name: string, value: string, days = 7) {
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax`
}

export function getCookie(name: string) {
  const encodedName = encodeURIComponent(name) + "="
  const cookies = document.cookie.split("; ")
  for (const cookie of cookies) {
    if (cookie.startsWith(encodedName)) {
      return decodeURIComponent(cookie.slice(encodedName.length))
    }
  }
  return null
}

export function removeCookie(name: string) {
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`
}
