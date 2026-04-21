export const auth = {
  en: {
    login: {
      title: 'Sign in to Trackvest',
      subtitle: 'Use your account email and password to continue.',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Your password',
      submit: 'Sign in',
      submitting: 'Signing in...',
      invalidCredentials: 'Invalid email or password.',
      genericError: 'Unable to sign in. Please try again.',
    },
    logout: 'Sign out',
  },
  'zh-TW': {
    login: {
      title: '登入 Trackvest',
      subtitle: '請輸入您的帳號 Email 與密碼。',
      emailLabel: '電子郵件',
      emailPlaceholder: 'you@example.com',
      passwordLabel: '密碼',
      passwordPlaceholder: '您的密碼',
      submit: '登入',
      submitting: '登入中...',
      invalidCredentials: '帳號或密碼錯誤。',
      genericError: '登入失敗，請稍後再試。',
    },
    logout: '登出',
  },
} as const
