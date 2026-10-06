import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { sanitizeRichText } from '../common/sanitize'
import { removeUploadedFile } from '../common/uploaded-files'
import { GalleryAlbum } from '../gallery/entities/gallery-album.entity'
import { CreateCompetitionDto, UpdateCompetitionDto } from './dto/competition.dto'
import { Competition, type CompetitionKind, type CompetitionWinner } from './entities/competition.entity'

/** Results read as a ranking, so they are stored in that order. */
const byRank = (winners: CompetitionWinner[] = []) => [...winners].sort((a, b) => a.rank - b.rank)

/** Album tags that name a competition the records already know by its code. */
const KIND_FOR_TAG: Record<string, CompetitionKind> = { speechContest: 'speech', writingContest: 'writing' }

/** An album's description is plain text; a record's summary is HTML. */
const asParagraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
    .join('')

@Injectable()
export class CompetitionsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CompetitionsService.name)

  constructor(
    @InjectRepository(Competition)
    private readonly competitionRepository: Repository<Competition>,
    @InjectRepository(GalleryAlbum)
    private readonly albumRepository: Repository<GalleryAlbum>,
  ) {}

  /**
   * 행사 사진첩 and 대회 기록 are one record now. Each photo album is carried
   * over once: into the competition it already documents when there is one
   * of the same kind, year and title — filling only what that record lacks —
   * and as a record of its own otherwise. The album table itself is left
   * untouched, as it was, so nothing is lost if this ever needs undoing.
   */
  async onApplicationBootstrap() {
    const albums = await this.albumRepository.find()
    // Deleted records too: an album carried over and then deleted must not
    // be carried over again on the next start.
    const records = await this.competitionRepository.find({ withDeleted: true })
    const carried = new Set(records.map((record) => record.sourceAlbumId).filter(Boolean))
    let merged = 0
    let created = 0

    for (const album of albums) {
      if (carried.has(album.id)) {
        continue
      }

      const kind = KIND_FOR_TAG[album.eventTag] ?? album.eventTag
      const twin = records.find(
        (record) => !record.sourceAlbumId && record.kind === kind && record.year === album.year && record.title.trim() === album.title.trim(),
      )

      if (twin) {
        twin.coverImage ??= album.coverImage
        twin.images = twin.images?.length ? twin.images : (album.images ?? [])
        twin.albumUrl ??= album.albumUrl
        twin.heldOn ??= album.heldOn
        twin.summary ||= asParagraphs(album.description ?? '')
        twin.sourceAlbumId = album.id
        await this.competitionRepository.save(twin)
        merged += 1
        continue
      }

      await this.competitionRepository.save(
        this.competitionRepository.create({
          kind,
          title: album.title,
          year: album.year,
          heldOn: album.heldOn ?? null,
          venue: '',
          participants: null,
          summary: asParagraphs(album.description ?? ''),
          winners: [],
          coverImage: album.coverImage ?? null,
          images: album.images ?? [],
          albumUrl: album.albumUrl ?? null,
          isPublished: album.isPublished,
          sourceAlbumId: album.id,
        }),
      )
      created += 1
    }

    if (merged + created > 0) {
      this.logger.log(`Carried ${merged + created} photo album(s) over: ${merged} into existing records, ${created} as new ones.`)
    }
  }

  /** Newest edition first — a record page is read from the top. */
  private readonly order = { year: 'DESC', heldOn: 'DESC', title: 'ASC' } as const

  list({ kind, publishedOnly }: { kind?: CompetitionKind; publishedOnly: boolean }) {
    return this.competitionRepository.find({
      where: {
        ...(kind ? { kind } : {}),
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      order: this.order,
    })
  }

  async getById(id: string) {
    const competition = await this.competitionRepository.findOne({ where: { id } })

    if (!competition) {
      throw new NotFoundException('errors.competition.notFound')
    }

    return competition
  }

  create(dto: CreateCompetitionDto) {
    const competition = this.competitionRepository.create({
      ...dto,
      heldOn: dto.heldOn || null,
      venue: dto.venue ?? '',
      participants: dto.participants ?? null,
      summary: sanitizeRichText(dto.summary ?? ''),
      winners: byRank(dto.winners),
      coverImage: dto.coverImage ?? null,
      images: dto.images ?? [],
      albumUrl: dto.albumUrl || null,
      isPublished: dto.isPublished ?? true,
    })

    return this.competitionRepository.save(competition)
  }

  async update(id: string, dto: UpdateCompetitionDto) {
    const competition = await this.getById(id)
    const previousCover = competition.coverImage
    const previousImages = competition.images ?? []

    Object.assign(competition, dto, {
      ...(dto.summary !== undefined ? { summary: sanitizeRichText(dto.summary) } : {}),
      ...(dto.winners !== undefined ? { winners: byRank(dto.winners) } : {}),
      ...(dto.heldOn !== undefined ? { heldOn: dto.heldOn || null } : {}),
      ...(dto.albumUrl !== undefined ? { albumUrl: dto.albumUrl || null } : {}),
    })

    const saved = await this.competitionRepository.save(competition)

    if (dto.coverImage !== undefined && previousCover && previousCover !== saved.coverImage) {
      await removeUploadedFile(previousCover)
    }

    // Photos dropped from the list should not linger on disk.
    if (dto.images !== undefined) {
      const kept = new Set(saved.images ?? [])
      await Promise.all(previousImages.filter((url) => !kept.has(url)).map((url) => removeUploadedFile(url)))
    }

    return saved
  }

  async remove(id: string) {
    const competition = await this.getById(id)
    // To 최근 삭제된 항목: restorable for 30 days; files stay until it is purged.
    await this.competitionRepository.softRemove(competition)
    return { success: true }
  }
}
