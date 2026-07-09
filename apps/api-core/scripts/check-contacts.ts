/**
 * Script to check if contact data exists in the database
 */

import mongoose from 'mongoose';
import { Contact } from '../src/modules/content/contact.model';
import { config } from '../src/core/config';

const checkContacts = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB');

    // Count total contacts
    const totalCount = await Contact.countDocuments();
    console.log(`\n📊 Total Contacts in Database: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n⚠️  No contact records found in the database.');
      console.log('   This means no contact forms have been submitted yet.');
      console.log('   To test: Submit a contact form from the frontend /contact page.');
    } else {
      // Get all contacts
      const contacts = await Contact.find().sort({ createdAt: -1 }).limit(10);
      
      console.log(`\n📋 Recent Contacts (showing up to 10):`);
      console.log('─'.repeat(80));
      
      contacts.forEach((contact, index) => {
        console.log(`\n${index + 1}. Contact ID: ${contact._id}`);
        console.log(`   Name: ${contact.name}`);
        console.log(`   Email: ${contact.email}`);
        console.log(`   Subject: ${contact.subject}`);
        console.log(`   Status: ${contact.status}`);
        console.log(`   Created: ${contact.createdAt}`);
        console.log(`   Message: ${contact.message.substring(0, 50)}...`);
      });

      // Get status breakdown
      const statusBreakdown = await Contact.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      console.log('\n📈 Status Breakdown:');
      statusBreakdown.forEach((stat) => {
        console.log(`   ${stat._id}: ${stat.count}`);
      });
    }

    // Disconnect
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the script
checkContacts();

