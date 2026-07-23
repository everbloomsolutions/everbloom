import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, ContactDocument } from './schemas/contact.schema';
import { ContactDto } from './dto/contact.dto';
import { MailService } from '../../infrastructure/mail/mail.service';
import { PaginationService } from '../../common/pagination/pagination.service';
import { ValidationService } from '../../common/validation/validation.service';
import { PAGINATION } from '../../config/constants';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ContactListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'new' | 'read' | 'replied' | 'archived';
}

export interface ContactListResponse {
  contacts: ContactDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @Inject(MailService) private mailService: MailService,
    @Inject(PaginationService) private paginationService: PaginationService,
    @Inject(ValidationService) private validationService: ValidationService,
  ) {}

  async processContactForm(
    data: ContactDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ContactDocument> {
    try {
      // Ensure subject is set
      const finalSubject =
        data.subject && data.subject.trim().length >= 3
          ? data.subject.trim()
          : 'General Inquiry';

      // Save to database
      const contact = await this.contactModel.create({
        name: data.name.trim(),
        email: data.email.trim(),
        subject: finalSubject,
        message: data.message.trim(),
        status: 'new',
        ipAddress,
        userAgent,
      });

      this.logger.log('Contact form submission saved to database', {
        contactId: contact._id,
        email: data.email,
      });

      // Send email notifications (non-blocking, fire-and-forget)
      (async () => {
        try {
          await Promise.all([
            this.mailService.sendContactNotificationToAdmin({
              name: data.name,
              email: data.email,
              subject: finalSubject,
              message: data.message,
            }),
            this.mailService.sendContactConfirmationToUser({
              name: data.name,
              email: data.email,
              subject: finalSubject,
              message: data.message,
            }),
          ]);
        } catch (error) {
          // Log email errors but don't fail the request
          this.logger.error('Failed to send contact form emails', {
            error: error instanceof Error ? error.message : 'Unknown error',
            contactId: contact._id,
            email: data.email,
          });
        }
      })();

      return contact;
    } catch (error) {
      this.logger.error('Error processing contact form', error);
      throw error;
    }
  }

  async getContacts(params: ContactListParams = {}): Promise<ContactListResponse> {
    const validatedPage = this.paginationService.validatePage(params.page, 1);
    const validatedLimit = this.paginationService.validateLimit(
      params.limit,
      PAGINATION.MAX_LIMIT,
      PAGINATION.DEFAULT_LIMIT,
    );
    const skip = this.paginationService.calculateSkip(validatedPage, validatedLimit);

    const filter: Record<string, unknown> = {};

    if (params.search) {
      // Use text search for indexed fields
      filter.$text = { $search: params.search };
    }

    if (params.status) {
      filter.status = params.status;
    }

    const [contacts, total] = await Promise.all([
      this.contactModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(validatedLimit)
        .exec(),
      this.contactModel.countDocuments(filter),
    ]);

    return {
      contacts,
      total,
      page: validatedPage,
      limit: validatedLimit,
      totalPages: this.paginationService.calculateTotalPages(total, validatedLimit),
    };
  }

  async getContactById(id: string): Promise<ContactDocument> {
    const contactObjectId = this.validationService.validateObjectId(id, 'contactId');
    const contact = await this.contactModel.findById(contactObjectId).exec();
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  async updateContactStatus(
    id: string,
    status: 'new' | 'read' | 'replied' | 'archived',
  ): Promise<ContactDocument> {
    const contactObjectId = this.validationService.validateObjectId(id, 'contactId');
    const contact = await this.contactModel
      .findByIdAndUpdate(contactObjectId, { status }, { new: true, runValidators: true })
      .exec();
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  async deleteContact(id: string): Promise<void> {
    const contactObjectId = this.validationService.validateObjectId(id, 'contactId');
    const contact = await this.contactModel.findByIdAndDelete(contactObjectId).exec();
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
  }

  async getContactStats(): Promise<{
    total: number;
    new: number;
    read: number;
    replied: number;
    archived: number;
    recent: number;
  }> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, newCount, read, replied, archived, recent] = await Promise.all([
      this.contactModel.countDocuments({}),
      this.contactModel.countDocuments({ status: 'new' }),
      this.contactModel.countDocuments({ status: 'read' }),
      this.contactModel.countDocuments({ status: 'replied' }),
      this.contactModel.countDocuments({ status: 'archived' }),
      this.contactModel.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    return {
      total,
      new: newCount,
      read,
      replied,
      archived,
      recent,
    };
  }
}
