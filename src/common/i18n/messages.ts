/**
 * Every user-facing message the API can emit, keyed. Services and DTOs throw
 * / declare *keys*; `I18nExceptionFilter` turns them into text for the
 * language in the request's Accept-Language header. English is the
 * reference: the other three are typed against it.
 */
export const SUPPORTED_LANGUAGES = ['en', 'ru', 'ko', 'ky'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'ko'

const en = {
  // ---- validation: materials
  'validation.material.titleRequired': 'Enter a title.',
  'validation.material.subjectRequired': 'Select a subject.',
  'validation.material.courseRequired': 'Select a course.',
  'validation.material.fileType': 'Unsupported file type (.{ext}). Allowed: {allowed}',

  // ---- validation: auth
  'validation.auth.usernameRequired': 'Enter a username.',

  // ---- validation: courses
  'validation.course.titleRequired': 'Enter a course title.',
  'validation.course.subjectRequired': 'Enter a subject.',
  'validation.course.startDateRequired': 'Choose a start date.',
  'validation.course.endDateRequired': 'Choose an end date.',
  'validation.course.endBeforeStart': 'The end date must be after the start date.',

  // ---- validation: news / schedule
  'validation.news.titleRequired': 'Enter a title.',
  'validation.news.bodyRequired': 'Enter the announcement text.',
  'validation.schedule.timeInvalid': 'Use HH:mm for times.',
  'validation.schedule.endBeforeStart': 'End time must be after start time.',

  // ---- validation: images / staff
  'validation.image.required': 'Choose an image file.',
  'validation.image.type': 'Unsupported image format. Allowed: {allowed}',
  'validation.staff.nameRequired': "Enter the staff member's name.",
  'validation.staff.positionRequired': 'Enter a position.',

  // ---- domain errors
  'errors.login.invalid': 'The username or password is incorrect.',
  'errors.auth.required': 'Please sign in to continue.',
  'errors.auth.forbidden': 'You do not have access to this.',
  'errors.course.notFound': 'Course not found.',
  'errors.material.notFound': 'Material not found.',
  'errors.material.notAvailable': 'This material is not available.',
  'errors.news.notFound': 'Announcement not found.',
  'validation.album.titleRequired': 'Enter an album title.',
  'validation.album.urlInvalid': 'Enter a full link starting with https://',
  'validation.album.dateInvalid': 'Use YYYY-MM-DD for the date.',
  'validation.textbook.titleRequired': 'Enter the textbook title.',
  'validation.textbook.urlInvalid': 'Enter a full link starting with https://',
  'errors.textbook.notFound': 'Textbook not found.',
  'errors.album.notFound': 'Album not found.',
  'errors.staff.notFound': 'Staff member not found.',
  'errors.fileTooLarge': 'The file is too large. Maximum is {max}.',
} as const

export type MessageKey = keyof typeof en
type Dictionary = Record<MessageKey, string>

const ru: Dictionary = {
  'validation.material.titleRequired': 'Введите название.',
  'validation.material.subjectRequired': 'Выберите предмет.',
  'validation.material.courseRequired': 'Выберите курс.',
  'validation.material.fileType': 'Формат не поддерживается (.{ext}). Разрешено: {allowed}',
  'validation.auth.usernameRequired': 'Введите имя пользователя.',
  'validation.course.titleRequired': 'Введите название курса.',
  'validation.course.subjectRequired': 'Введите предмет.',
  'validation.course.startDateRequired': 'Выберите дату начала.',
  'validation.course.endDateRequired': 'Выберите дату окончания.',
  'validation.course.endBeforeStart': 'Дата окончания должна быть позже даты начала.',
  'validation.news.titleRequired': 'Введите заголовок.',
  'validation.news.bodyRequired': 'Введите текст объявления.',
  'validation.schedule.timeInvalid': 'Время в формате ЧЧ:ММ.',
  'validation.schedule.endBeforeStart': 'Время окончания должно быть позже начала.',
  'validation.image.required': 'Выберите изображение.',
  'validation.image.type': 'Формат изображения не поддерживается. Разрешено: {allowed}',
  'validation.staff.nameRequired': 'Введите имя сотрудника.',
  'validation.staff.positionRequired': 'Введите должность.',
  'errors.login.invalid': 'Неверное имя пользователя или пароль.',
  'errors.auth.required': 'Войдите, чтобы продолжить.',
  'errors.auth.forbidden': 'У вас нет доступа к этому разделу.',
  'errors.course.notFound': 'Курс не найден.',
  'errors.material.notFound': 'Материал не найден.',
  'errors.material.notAvailable': 'Материал недоступен.',
  'errors.news.notFound': 'Объявление не найдено.',
  'validation.album.titleRequired': 'Введите название альбома.',
  'validation.album.urlInvalid': 'Укажите полную ссылку, начиная с https://',
  'validation.album.dateInvalid': 'Дата в формате ГГГГ-ММ-ДД.',
  'validation.textbook.titleRequired': 'Введите название учебника.',
  'validation.textbook.urlInvalid': 'Укажите полную ссылку, начиная с https://',
  'errors.textbook.notFound': 'Учебник не найден.',
  'errors.album.notFound': 'Альбом не найден.',
  'errors.staff.notFound': 'Сотрудник не найден.',
  'errors.fileTooLarge': 'Файл слишком большой. Максимум — {max}.',
}

const ko: Dictionary = {
  'validation.material.titleRequired': '자료 제목을 입력하세요.',
  'validation.material.subjectRequired': '과목을 선택하세요.',
  'validation.material.courseRequired': '과정을 선택하세요.',
  'validation.material.fileType': '지원하지 않는 파일 형식입니다 (.{ext}). 허용: {allowed}',
  'validation.auth.usernameRequired': '아이디를 입력하세요.',
  'validation.course.titleRequired': '과정명을 입력하세요.',
  'validation.course.subjectRequired': '과목을 입력하세요.',
  'validation.course.startDateRequired': '시작일을 선택하세요.',
  'validation.course.endDateRequired': '종료일을 선택하세요.',
  'validation.course.endBeforeStart': '종료일은 시작일 이후여야 합니다.',
  'validation.news.titleRequired': '제목을 입력하세요.',
  'validation.news.bodyRequired': '공지 내용을 입력하세요.',
  'validation.schedule.timeInvalid': '시간은 HH:mm 형식으로 입력하세요.',
  'validation.schedule.endBeforeStart': '종료 시간은 시작 시간 이후여야 합니다.',
  'validation.image.required': '이미지 파일을 선택하세요.',
  'validation.image.type': '지원하지 않는 이미지 형식입니다. 허용: {allowed}',
  'validation.staff.nameRequired': '교직원 이름을 입력하세요.',
  'validation.staff.positionRequired': '직책을 입력하세요.',
  'errors.login.invalid': '아이디 또는 비밀번호가 올바르지 않습니다.',
  'errors.auth.required': '로그인 후 이용할 수 있습니다.',
  'errors.auth.forbidden': '접근 권한이 없습니다.',
  'errors.course.notFound': '과정을 찾을 수 없습니다.',
  'errors.material.notFound': '자료를 찾을 수 없습니다.',
  'errors.material.notAvailable': '이용할 수 없는 자료입니다.',
  'errors.news.notFound': '공지를 찾을 수 없습니다.',
  'validation.album.titleRequired': '사진첩 제목을 입력하세요.',
  'validation.album.urlInvalid': 'https:// 로 시작하는 전체 링크를 입력하세요.',
  'validation.album.dateInvalid': '날짜는 YYYY-MM-DD 형식으로 입력하세요.',
  'validation.textbook.titleRequired': '교재명을 입력하세요.',
  'validation.textbook.urlInvalid': 'https:// 로 시작하는 전체 링크를 입력하세요.',
  'errors.textbook.notFound': '교재를 찾을 수 없습니다.',
  'errors.album.notFound': '사진첩을 찾을 수 없습니다.',
  'errors.staff.notFound': '교직원을 찾을 수 없습니다.',
  'errors.fileTooLarge': '파일이 너무 큽니다. 최대 {max}까지 가능합니다.',
}

const ky: Dictionary = {
  'validation.material.titleRequired': 'Аталышын киргизиңиз.',
  'validation.material.subjectRequired': 'Предметти тандаңыз.',
  'validation.material.courseRequired': 'Курсту тандаңыз.',
  'validation.material.fileType': 'Файл форматы колдоого алынбайт (.{ext}). Уруксат берилген: {allowed}',
  'validation.auth.usernameRequired': 'Колдонуучунун атын киргизиңиз.',
  'validation.course.titleRequired': 'Курстун аталышын киргизиңиз.',
  'validation.course.subjectRequired': 'Предметти киргизиңиз.',
  'validation.course.startDateRequired': 'Башталуу күнүн тандаңыз.',
  'validation.course.endDateRequired': 'Аяктоо күнүн тандаңыз.',
  'validation.course.endBeforeStart': 'Аяктоо күнү башталуу күнүнөн кийин болушу керек.',
  'validation.news.titleRequired': 'Аталышын киргизиңиз.',
  'validation.news.bodyRequired': 'Билдирүүнүн текстин киргизиңиз.',
  'validation.schedule.timeInvalid': 'Убакытты СС:ММ форматында киргизиңиз.',
  'validation.schedule.endBeforeStart': 'Аяктоо убактысы башталуудан кийин болушу керек.',
  'validation.image.required': 'Сүрөт файлын тандаңыз.',
  'validation.image.type': 'Сүрөт форматы колдоого алынбайт. Уруксат берилген: {allowed}',
  'validation.staff.nameRequired': 'Кызматкердин атын киргизиңиз.',
  'validation.staff.positionRequired': 'Кызмат ордун киргизиңиз.',
  'errors.login.invalid': 'Колдонуучунун аты же сырсөз туура эмес.',
  'errors.auth.required': 'Улантуу үчүн кириңиз.',
  'errors.auth.forbidden': 'Бул бөлүмгө кирүүгө уруксатыңыз жок.',
  'errors.course.notFound': 'Курс табылган жок.',
  'errors.material.notFound': 'Материал табылган жок.',
  'errors.material.notAvailable': 'Бул материал жеткиликсиз.',
  'errors.news.notFound': 'Билдирүү табылган жок.',
  'validation.album.titleRequired': 'Альбомдун аталышын киргизиңиз.',
  'validation.album.urlInvalid': 'https:// менен башталган толук шилтемени киргизиңиз.',
  'validation.album.dateInvalid': 'Күн YYYY-MM-DD форматында болушу керек.',
  'validation.textbook.titleRequired': 'Окуу китебинин аталышын киргизиңиз.',
  'validation.textbook.urlInvalid': 'https:// менен башталган толук шилтемени киргизиңиз.',
  'errors.textbook.notFound': 'Окуу китеби табылган жок.',
  'errors.album.notFound': 'Альбом табылган жок.',
  'errors.staff.notFound': 'Кызматкер табылган жок.',
  'errors.fileTooLarge': 'Файл өтө чоң. Максимум — {max}.',
}

export const dictionaries: Record<Language, Dictionary> = { en, ru, ko, ky }

const KEY_PATTERN = /^(validation|errors)(\.[a-zA-Z]+)+$/

export function isMessageKey(value: unknown): value is MessageKey {
  return typeof value === 'string' && KEY_PATTERN.test(value) && value in en
}

/** Picks the best supported language from an Accept-Language header. */
export function resolveLanguage(header: string | undefined): Language {
  if (!header) {
    return DEFAULT_LANGUAGE
  }

  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
      return { tag: tag.toLowerCase().slice(0, 2), q: q ? Number(q.slice(2)) : 1, index }
    })
    .sort((a, b) => b.q - a.q || a.index - b.index)

  const match = ranked.find((item) => (SUPPORTED_LANGUAGES as readonly string[]).includes(item.tag))
  return (match?.tag as Language | undefined) ?? DEFAULT_LANGUAGE
}

/**
 * Translates a key with `{placeholder}` substitution. A string that is not a
 * key is returned unchanged, so class-validator's own English defaults and
 * ad-hoc messages still pass through.
 */
export function translateMessage(language: Language, message: string, params?: Record<string, string | number>): string {
  const template = isMessageKey(message) ? dictionaries[language][message] ?? en[message] : message

  if (!params) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in params ? String(params[name]) : `{${name}}`))
}
