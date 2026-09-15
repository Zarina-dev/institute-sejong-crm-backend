import { PartialType } from '@nestjs/mapped-types'

import { CreateMaterialDto } from './create-material.dto'

/** `PATCH /materials/:id` — every field optional, same whitelist. */
export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
