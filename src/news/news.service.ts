import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { sanitizeRichText } from '../common/sanitize'
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto'
import { NewsPost } from './entities/news-post.entity'

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsPost)
    private readonly newsRepository: Repository<NewsPost>,
  ) {}

  /** Public feed: published only, newest first, featured pinned on top. */
  listPublished(limit?: number) {
    return this.newsRepository.find({
      where: { isPublished: true },
      order: { isFeatured: 'DESC', publishedAt: 'DESC' },
      ...(limit ? { take: limit } : {}),
    })
  }

  /**
   * Admin listing: everything, drafts included — but not the bodies. The
   * table shows titles, dates and status; the body is only needed when one
   * post is opened, and comes from GET /news/:id then. With the bodies, the
   * list grew with every post ever written (18.5 MB for 2 000 posts).
   */
  listAll() {
    return this.newsRepository.find({
      select: {
        id: true,
        title: true,
        coverImage: true,
        category: true,
        isPublished: true,
        isFeatured: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      order: { updatedAt: 'DESC' },
    })
  }

  async getById(id: string) {
    const post = await this.newsRepository.findOne({ where: { id } })

    if (!post) {
      throw new NotFoundException('errors.news.notFound')
    }

    return post
  }

  create(dto: CreateNewsDto) {
    const post = this.newsRepository.create({
      ...dto,
      body: sanitizeRichText(dto.body),
      category: dto.category ?? 'campus',
      isPublished: dto.isPublished ?? false,
      isFeatured: dto.isFeatured ?? false,
      publishedAt: dto.isPublished ? new Date() : null,
    })

    return this.newsRepository.save(post)
  }

  async update(id: string, dto: UpdateNewsDto) {
    const post = await this.getById(id)
    const becomesPublished = dto.isPublished === true && !post.isPublished

    Object.assign(post, dto, dto.body !== undefined ? { body: sanitizeRichText(dto.body) } : {})

    // The publish date is the first time the post went live, not every edit.
    if (becomesPublished && !post.publishedAt) {
      post.publishedAt = new Date()
    }

    return this.newsRepository.save(post)
  }

  async setPublished(id: string, isPublished: boolean) {
    return this.update(id, { isPublished })
  }

  async remove(id: string) {
    const post = await this.getById(id)
    await this.newsRepository.remove(post)
    return { success: true }
  }
}
