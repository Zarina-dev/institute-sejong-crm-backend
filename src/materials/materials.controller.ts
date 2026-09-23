import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'

import { Authenticated, CurrentUser } from '../auth/auth.guard'
import type { AuthUser } from '../auth/auth.service'
import { CreateMaterialDto } from './dto/create-material.dto'
import { UpdateMaterialDto } from './dto/update-material.dto'
import { MaterialsService, type MaterialsQuery } from './materials.service'
import { materialUploadOptions } from './upload.config'

/**
 * 학습자료실: the list and the download are public (the site has no student
 * accounts); uploading and editing require the admin.
 */
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  /** Visitors always get the published rows; only the admin may ask for drafts. */
  @Get()
  list(@Query() query: MaterialsQuery, @CurrentUser() user: AuthUser | null) {
    return this.materialsService.listMaterials(user?.role === 'admin' ? query : { ...query, published: 'true' })
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.getMaterialById(id)
  }

  @Get(':id/download')
  async download(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const material = await this.materialsService.getMaterialById(id)

    if (!material.isPublished || !material.storageKey) {
      throw new NotFoundException('errors.material.notAvailable')
    }

    res.download(material.storageKey, material.originalFileName ?? material.title)
  }

  @Post()
  @Authenticated('admin')
  @UseInterceptors(FileInterceptor('file', materialUploadOptions))
  create(@Body() body: CreateMaterialDto, @UploadedFile() file?: Express.Multer.File) {
    return this.materialsService.createMaterial(body, file)
  }

  @Patch(':id')
  @Authenticated('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateMaterialDto) {
    return this.materialsService.updateMaterial(id, body)
  }

  @Delete(':id')
  @Authenticated('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.deleteMaterial(id)
  }

  @Post(':id/publish')
  @Authenticated('admin')
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.setPublished(id, true)
  }

  @Post(':id/unpublish')
  @Authenticated('admin')
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.setPublished(id, false)
  }
}
