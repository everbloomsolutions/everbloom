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

  const usersWithoutDefaultLocation = await User.find({
    role: 'user',
    $or: [{ defaultLocation: { $exists: false } }, { defaultLocation: null }],
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  }).select('_id').lean();

  console.log(`Found ${usersWithoutDefaultLocation.length} users without a defaultLocation.`);

  let updated = 0;
  let unchanged = 0;

  for (const user of usersWithoutDefaultLocation) {
    const mostRecentProject = await Project.findOne({
      userId: user._id,
      locationId: { $exists: true, $ne: null },
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .select('locationId')
      .lean();

    if (mostRecentProject?.locationId) {
      await User.updateOne(
        { _id: user._id },
        { defaultLocation: mostRecentProject.locationId },
      );
      updated++;
      console.log(`Updated user ${user._id} with defaultLocation ${mostRecentProject.locationId}`);
    } else {
      unchanged++;
      console.log(`No project found for user ${user._id}`);
    }
  }

  console.log(`\nBackfill complete: ${updated} updated, ${unchanged} unchanged.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
