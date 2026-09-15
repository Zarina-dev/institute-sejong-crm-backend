import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { randomUUID } from 'crypto'
import { MaterialsService, MaterialsQuery } from './materials.service'
import { LearningMaterial } from './entities/learning-material.entity'

const MATERIALS_STORAGE_DIR = './uploads/materials'

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  async list(@Query() query: MaterialsQuery) {
    return this.materialsService.listMaterials(query)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.materialsService.getMaterialById(id)
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const material = await this.materialsService.getMaterialById(id)

    if (!material.isPublished || !material.storageKey) {
      res.status(404).json({ message: 'Material not available' })
      return
    }

    res.download(material.storageKey, material.originalFileName ?? material.title)
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: MATERIALS_STORAGE_DIR,
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname || 'file').toLowerCase()
          cb(null, `${randomUUID()}${safeExt}`)
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'mp4', 'webm', 'txt']
        const ext = extname(file.originalname || '').toLowerCase().slice(1)

        if (!allowed.includes(ext)) {
          cb(new Error('Unsupported file type'), false)
          return
        }

        cb(null, true)
      },
    }),
  )
  async create(
    @Body() body: Partial<LearningMaterial>,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const input: Partial<LearningMaterial> = {
      ...body,
      storageKey: file?.path ?? null,
      originalFileName: file?.originalname ?? body.originalFileName ?? null,
      fileType: file?.mimetype ?? body.fileType ?? null,
      fileSize: file?.size ?? body.fileSize ?? null,
      isPublished: body.isPublished ?? false,
    }

    return this.materialsService.createMaterial(input)
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<LearningMaterial>) {
    return this.materialsService.updateMaterial(id, body)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.materialsService.deleteMaterial(id)
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    return this.materialsService.publishMaterial(id)
  }

  @Post(':id/unpublish')
  async unpublish(@Param('id') id: string) {
    return this.materialsService.unpublishMaterial(id)
  }
}
