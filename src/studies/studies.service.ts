import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { removeUploadedFile } from '../common/uploaded-files'
import { CreateStudyAbroadDto, UpdateStudyAbroadDto } from './dto/study-abroad.dto'
import { StudyAbroad } from './entities/study-abroad.entity'

/** The texts kept in both languages: Korean in `field`, Kyrgyz in `fieldKy`. */
const BILINGUAL = ['name', 'university', 'major', 'programme', 'duration', 'note'] as const
type Bilingual = (typeof BILINGUAL)[number]

const HANGUL = /[가-힣]/
const CYRILLIC = /[Ѐ-ӿ]/

@Injectable()
export class StudiesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StudiesService.name)

  constructor(
    @InjectRepository(StudyAbroad)
    private readonly studyRepository: Repository<StudyAbroad>,
  ) {}

  /**
   * Oldest first — the list is read as the institute's record of everyone it
   * has sent, from the first student onwards, so someone entered today joins
   * the end. Within a year, the order they were entered in.
   */
  private readonly order = { year: 'ASC', createdAt: 'ASC' } as const

  /**
   * Before the Kyrgyz fields existed, whatever was typed went into the one
   * field per item — Korean for some students, Kyrgyz for others ("Азимова
   * Гулжан", "Кёнхи унив."). Once, on start, a text written in Cyrillic with
   * no Hangul in it is moved to its Kyrgyz field, when that is still empty.
   * Decided by the script the text is in, nothing else.
   */
  async onApplicationBootstrap() {
    const entries = await this.studyRepository.find()
    let moved = 0

    for (const entry of entries) {
      let changed = false

      for (const field of BILINGUAL) {
        const korean = entry[field]
        const kyrgyz = `${field}Ky` as `${Bilingual}Ky`

        if (korean && !entry[kyrgyz] && CYRILLIC.test(korean) && !HANGUL.test(korean)) {
          entry[kyrgyz] = korean
          entry[field] = ''
          changed = true
        }
      }

      if (changed) {
        await this.studyRepository.save(entry)
        moved += 1
      }
    }

    if (moved > 0) {
      this.logger.log(`Moved Kyrgyz texts into their own fields for ${moved} student(s).`)
    }
  }

  list({ publishedOnly }: { publishedOnly: boolean }) {
    return this.studyRepository.find({
      where: publishedOnly ? { isPublished: true } : {},
      order: this.order,
    })
  }

  async getById(id: string) {
    const entry = await this.studyRepository.findOne({ where: { id } })

    if (!entry) {
      throw new NotFoundException('errors.study.notFound')
    }

    return entry
  }

  create(dto: CreateStudyAbroadDto) {
    const texts = Object.fromEntries(BILINGUAL.flatMap((field) => [[field, dto[field] ?? ''], [`${field}Ky`, dto[`${field}Ky`] ?? '']]))

    const entry = this.studyRepository.create({
      ...dto,
      ...texts,
      photo: dto.photo ?? null,
      isPublished: dto.isPublished ?? true,
    })

    this.assertNamed(entry)

    return this.studyRepository.save(entry)
  }

  async update(id: string, dto: UpdateStudyAbroadDto) {
    const entry = await this.getById(id)
    const previousPhoto = entry.photo

    Object.assign(entry, dto)
    this.assertNamed(entry)

    const saved = await this.studyRepository.save(entry)

    if (dto.photo !== undefined && previousPhoto && previousPhoto !== saved.photo) {
      await removeUploadedFile(previousPhoto)
    }

    return saved
  }

  async remove(id: string) {
    const entry = await this.getById(id)
    // To 최근 삭제된 항목: restorable for 30 days; files stay until it is purged.
    await this.studyRepository.softRemove(entry)

    return { success: true }
  }

  /** A student needs a name — in Korean, in Kyrgyz, or both. */
  private assertNamed(entry: StudyAbroad) {
    if (!entry.name?.trim() && !entry.nameKy?.trim()) {
      throw new BadRequestException('validation.study.nameRequired')
    }
  }
}
