import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
const cwd = process.cwd();
const maybeRoot = path.resolve(cwd, '../..');
dotenv.config({ path: path.join(maybeRoot, '.env') });
dotenv.config({ path: path.join(maybeRoot, '.env.local') });
dotenv.config({ path: path.join(cwd, '.env') });
dotenv.config({ path: path.join(cwd, '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/everbloom';

const userSchema = new mongoose.Schema(
  {
    defaultLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    role: String,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

const projectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

async function main() {
  await mongoose.connect(MONGODB_URI);

  const User = mongoose.model('User', userSchema);
  const Project = mongoose.model('Project', projectSchema);

  const projects = await Project.find({
    locationId: { $exists: true, $ne: null },
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  })
    .select('userId locationId')
    .lean();

  console.log(`Found ${projects.length} projects with a locationId to evaluate.`);

  let updated = 0;
  let unchanged = 0;
  let ambiguous = 0;
  let noResident = 0;

  for (const project of projects) {
    const residents = await User.find({
      defaultLocation: project.locationId,
      role: 'user',
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    })
      .sort({ createdAt: 1 })
      .select('_id')
      .lean();

    if (residents.length === 0) {
      noResident++;
      console.log(`No resident found for project ${project._id} (location ${project.locationId})`);
      continue;
    }

    if (residents.length > 1) {
      ambiguous++;
      console.log(`Multiple residents found for location ${project.locationId}; using first user ${residents[0]._id} for project ${project._id}`);
    }

    const residentId = residents[0]._id;
    if (String(project.userId) === String(residentId)) {
      unchanged++;
      continue;
    }

    await Project.updateOne(
      { _id: project._id },
      { userId: residentId },
    );
    updated++;
    console.log(`Updated project ${project._id}: userId -> ${residentId}`);
  }

  console.log(`\nMigration complete: ${updated} updated, ${unchanged} already correct, ${ambiguous} ambiguous (first resident used), ${noResident} without resident.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
