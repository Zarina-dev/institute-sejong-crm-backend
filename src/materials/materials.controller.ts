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

import { Authenticated } from '../auth/auth.guard'
import { CreateMaterialDto } from './dto/create-material.dto'
import { UpdateMaterialDto } from './dto/update-material.dto'
import { MaterialsService, type MaterialsQuery } from './materials.service'
import { materialUploadOptions } from './upload.config'

/**
 * Learning materials are for enrolled students and staff only — nothing here
 * is public. Reading needs any signed-in user; writing needs the admin.
 */
@Controller('materials')
@Authenticated()
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  list(@Query() query: MaterialsQuery) {
    return this.materialsService.listMaterials(query)
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
