import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.guard';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async submitContact(
    @Body() contactDto: ContactDto,
    @Req() req: any,
  ) {
    // Get client IP and user agent for tracking
    const ipAddress = req.ip || req.socket?.remoteAddress || undefined;
    const userAgent = req.get('user-agent') || undefined;

    await this.contactService.processContactForm(contactDto, ipAddress, userAgent);

    return {
      success: true,
      message: 'Thank you for your message! We will get back to you soon.',
    };
  }
}

// Admin endpoints for contact management
@Controller('admin/contacts')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class ContactAdminController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  async getContacts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'new' | 'read' | 'replied' | 'archived',
  ) {
    const result = await this.contactService.getContacts({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      status,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get('stats')
  async getContactStats() {
    const stats = await this.contactService.getContactStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  async getContactById(@Param('id') id: string) {
    const contact = await this.contactService.getContactById(id);
    return {
      success: true,
      data: contact,
    };
  }

  @Put(':id')
  async updateContact(
    @Param('id') id: string,
    @Body('status') status: 'new' | 'read' | 'replied' | 'archived',
  ) {
    const contact = await this.contactService.updateContactStatus(id, status);
    return {
      success: true,
      data: contact,
      message: 'Contact updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteContact(@Param('id') id: string) {
    await this.contactService.deleteContact(id);
    return {
      success: true,
      message: 'Contact deleted successfully',
    };
  }
}
