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

  // ---- validation: students
  'validation.student.nameRequired': 'Enter a name.',
  'validation.student.idRequired': 'Enter a student ID.',
  'validation.student.idFormat': 'The student ID may not contain spaces or special characters.',
  'validation.student.emailInvalid': 'That does not look like an email address.',
  'validation.student.phoneRequired': 'Enter a phone number.',
  'validation.student.courseRequired': 'Select a course.',
  'validation.student.levelRequired': 'Select a TOPIK level.',
  'validation.student.admissionDate': 'The admission date is not valid.',
  'validation.student.passwordShort': 'The password must be at least 4 characters.',

  // ---- validation: courses / applications
  'validation.course.titleRequired': 'Enter a course title.',
  'validation.course.subjectRequired': 'Enter a subject.',
  'validation.application.nameRequired': 'Enter your name.',
  'validation.application.emailInvalid': 'That does not look like an email address.',

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
  'validation.staff.photoInvalid': 'Upload the photo through the site first.',

  // ---- domain errors
  'errors.student.idTaken': 'This student ID is already in use.',
  'errors.student.notFound': 'Student not found.',
  'errors.student.inactive': 'Inactive students cannot sign in.',
  'errors.login.invalid': 'The student ID or password is incorrect.',
  'errors.auth.required': 'Please sign in to continue.',
  'errors.auth.forbidden': 'You do not have access to this.',
  'errors.course.notFound': 'Course not found.',
  'errors.course.notPublished': 'Only published courses accept applications.',
  'errors.application.notFound': 'Application not found.',
  'errors.enrollment.duplicate': 'Already enrolled in this course.',
  'errors.material.notFound': 'Material not found.',
  'errors.material.notAvailable': 'This material is not available.',
  'errors.news.notFound': 'Announcement not found.',
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
  'validation.student.nameRequired': 'Введите имя.',
  'validation.student.idRequired': 'Введите ID студента.',
  'validation.student.idFormat': 'ID студента не может содержать пробелы и спецсимволы.',
  'validation.student.emailInvalid': 'Это не похоже на email.',
  'validation.student.phoneRequired': 'Введите телефон.',
  'validation.student.courseRequired': 'Выберите курс.',
  'validation.student.levelRequired': 'Выберите уровень TOPIK.',
  'validation.student.admissionDate': 'Дата поступления указана неверно.',
  'validation.student.passwordShort': 'Пароль должен быть не короче 4 символов.',
  'validation.course.titleRequired': 'Введите название курса.',
  'validation.course.subjectRequired': 'Введите предмет.',
  'validation.application.nameRequired': 'Введите имя.',
  'validation.application.emailInvalid': 'Это не похоже на email.',
  'validation.news.titleRequired': 'Введите заголовок.',
  'validation.news.bodyRequired': 'Введите текст объявления.',
  'validation.schedule.timeInvalid': 'Время в формате ЧЧ:ММ.',
  'validation.schedule.endBeforeStart': 'Время окончания должно быть позже начала.',
  'validation.image.required': 'Выберите изображение.',
  'validation.image.type': 'Формат изображения не поддерживается. Разрешено: {allowed}',
  'validation.staff.nameRequired': 'Введите имя сотрудника.',
  'validation.staff.positionRequired': 'Введите должность.',
  'validation.staff.photoInvalid': 'Сначала загрузите фото через сайт.',
  'errors.student.idTaken': 'Этот ID студента уже занят.',
  'errors.student.notFound': 'Студент не найден.',
  'errors.student.inactive': 'Неактивные студенты не могут войти.',
  'errors.login.invalid': 'Неверный ID студента или пароль.',
  'errors.auth.required': 'Войдите, чтобы продолжить.',
  'errors.auth.forbidden': 'У вас нет доступа к этому разделу.',
  'errors.course.notFound': 'Курс не найден.',
  'errors.course.notPublished': 'Заявки принимаются только на опубликованные курсы.',
  'errors.application.notFound': 'Заявка не найдена.',
  'errors.enrollment.duplicate': 'Уже зачислен на этот курс.',
  'errors.material.notFound': 'Материал не найден.',
  'errors.material.notAvailable': 'Материал недоступен.',
  'errors.news.notFound': 'Объявление не найдено.',
  'errors.staff.notFound': 'Сотрудник не найден.',
  'errors.fileTooLarge': 'Файл слишком большой. Максимум — {max}.',
}

const ko: Dictionary = {
  'validation.material.titleRequired': '자료 제목을 입력하세요.',
  'validation.material.subjectRequired': '과목을 선택하세요.',
  'validation.material.courseRequired': '과정을 선택하세요.',
  'validation.material.fileType': '지원하지 않는 파일 형식입니다 (.{ext}). 허용: {allowed}',
  'validation.student.nameRequired': '이름을 입력하세요.',
  'validation.student.idRequired': '학생 ID를 입력하세요.',
  'validation.student.idFormat': '학생 ID에는 공백이나 특수문자를 사용할 수 없습니다.',
  'validation.student.emailInvalid': '올바른 이메일 형식이 아닙니다.',
  'validation.student.phoneRequired': '전화번호를 입력하세요.',
  'validation.student.courseRequired': '과정을 선택하세요.',
  'validation.student.levelRequired': 'TOPIK 레벨을 선택하세요.',
  'validation.student.admissionDate': '입학 날짜 형식이 올바르지 않습니다.',
  'validation.student.passwordShort': '비밀번호는 4자 이상이어야 합니다.',
  'validation.course.titleRequired': '과정명을 입력하세요.',
  'validation.course.subjectRequired': '과목을 입력하세요.',
  'validation.application.nameRequired': '이름을 입력하세요.',
  'validation.application.emailInvalid': '올바른 이메일 형식이 아닙니다.',
  'validation.news.titleRequired': '제목을 입력하세요.',
  'validation.news.bodyRequired': '공지 내용을 입력하세요.',
  'validation.schedule.timeInvalid': '시간은 HH:mm 형식으로 입력하세요.',
  'validation.schedule.endBeforeStart': '종료 시간은 시작 시간 이후여야 합니다.',
  'validation.image.required': '이미지 파일을 선택하세요.',
  'validation.image.type': '지원하지 않는 이미지 형식입니다. 허용: {allowed}',
  'validation.staff.nameRequired': '교직원 이름을 입력하세요.',
  'validation.staff.positionRequired': '직책을 입력하세요.',
  'validation.staff.photoInvalid': '사진은 사이트를 통해 먼저 업로드해야 합니다.',
  'errors.student.idTaken': '이미 사용 중인 학생 ID입니다.',
  'errors.student.notFound': '학생을 찾을 수 없습니다.',
  'errors.student.inactive': '비활동 상태의 학생은 사이트에 접속할 수 없습니다.',
  'errors.login.invalid': '학생 ID 또는 비밀번호가 올바르지 않습니다.',
  'errors.auth.required': '로그인 후 이용할 수 있습니다.',
  'errors.auth.forbidden': '접근 권한이 없습니다.',
  'errors.course.notFound': '과정을 찾을 수 없습니다.',
  'errors.course.notPublished': '현재 공개 중인 과정만 신청할 수 있습니다.',
  'errors.application.notFound': '신청 내역을 찾을 수 없습니다.',
  'errors.enrollment.duplicate': '이미 등록된 과정입니다.',
  'errors.material.notFound': '자료를 찾을 수 없습니다.',
  'errors.material.notAvailable': '이용할 수 없는 자료입니다.',
  'errors.news.notFound': '공지를 찾을 수 없습니다.',
  'errors.staff.notFound': '교직원을 찾을 수 없습니다.',
  'errors.fileTooLarge': '파일이 너무 큽니다. 최대 {max}까지 가능합니다.',
}

const ky: Dictionary = {
  'validation.material.titleRequired': 'Аталышын киргизиңиз.',
  'validation.material.subjectRequired': 'Предметти тандаңыз.',
  'validation.material.courseRequired': 'Курсту тандаңыз.',
  'validation.material.fileType': 'Файл форматы колдоого алынбайт (.{ext}). Уруксат берилген: {allowed}',
  'validation.student.nameRequired': 'Атын киргизиңиз.',
  'validation.student.idRequired': 'Студент ID киргизиңиз.',
  'validation.student.idFormat': 'Студент ID боштук же атайын белгилерди камтыбашы керек.',
  'validation.student.emailInvalid': 'Бул email окшобойт.',
  'validation.student.phoneRequired': 'Телефонду киргизиңиз.',
  'validation.student.courseRequired': 'Курсту тандаңыз.',
  'validation.student.levelRequired': 'TOPIK деңгээлин тандаңыз.',
  'validation.student.admissionDate': 'Кабыл алынган күн туура эмес.',
  'validation.student.passwordShort': 'Сырсөз кеминде 4 белгиден турушу керек.',
  'validation.course.titleRequired': 'Курстун аталышын киргизиңиз.',
  'validation.course.subjectRequired': 'Предметти киргизиңиз.',
  'validation.application.nameRequired': 'Атыңызды киргизиңиз.',
  'validation.application.emailInvalid': 'Бул email окшобойт.',
  'validation.news.titleRequired': 'Аталышын киргизиңиз.',
  'validation.news.bodyRequired': 'Билдирүүнүн текстин киргизиңиз.',
  'validation.schedule.timeInvalid': 'Убакытты СС:ММ форматында киргизиңиз.',
  'validation.schedule.endBeforeStart': 'Аяктоо убактысы башталуудан кийин болушу керек.',
  'validation.image.required': 'Сүрөт файлын тандаңыз.',
  'validation.image.type': 'Сүрөт форматы колдоого алынбайт. Уруксат берилген: {allowed}',
  'validation.staff.nameRequired': 'Кызматкердин атын киргизиңиз.',
  'validation.staff.positionRequired': 'Кызмат ордун киргизиңиз.',
  'validation.staff.photoInvalid': 'Сүрөттү адегенде сайт аркылуу жүктөңүз.',
  'errors.student.idTaken': 'Бул студент ID мурунтан колдонулууда.',
  'errors.student.notFound': 'Студент табылган жок.',
  'errors.student.inactive': 'Активдүү эмес студенттер кире албайт.',
  'errors.login.invalid': 'Студент ID же сырсөз туура эмес.',
  'errors.auth.required': 'Улантуу үчүн кириңиз.',
  'errors.auth.forbidden': 'Бул бөлүмгө кирүүгө уруксатыңыз жок.',
  'errors.course.notFound': 'Курс табылган жок.',
  'errors.course.notPublished': 'Жарыяланган курстарга гана арыз берүүгө болот.',
  'errors.application.notFound': 'Арыз табылган жок.',
  'errors.enrollment.duplicate': 'Бул курска мурунтан катталгансыз.',
  'errors.material.notFound': 'Материал табылган жок.',
  'errors.material.notAvailable': 'Бул материал жеткиликсиз.',
  'errors.news.notFound': 'Билдирүү табылган жок.',
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
