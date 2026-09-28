import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { sanitizeRichText } from '../common/sanitize'
import { removeUploadedFile } from '../common/uploaded-files'
import { CreateCompetitionDto, UpdateCompetitionDto } from './dto/competition.dto'
import { Competition, type CompetitionKind, type CompetitionWinner } from './entities/competition.entity'

/** Results read as a ranking, so they are stored in that order. */
const byRank = (winners: CompetitionWinner[] = []) => [...winners].sort((a, b) => a.rank - b.rank)

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectRepository(Competition)
    private readonly competitionRepository: Repository<Competition>,
  ) {}

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
      albumUrl: dto.albumUrl || null,
      isPublished: dto.isPublished ?? true,
    })

    return this.competitionRepository.save(competition)
  }

  async update(id: string, dto: UpdateCompetitionDto) {
    const competition = await this.getById(id)
    const previousCover = competition.coverImage

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

    return saved
  }

  async remove(id: string) {
    const competition = await this.getById(id)
    await this.competitionRepository.remove(competition)
    await removeUploadedFile(competition.coverImage)
    return { success: true }
  }
}
