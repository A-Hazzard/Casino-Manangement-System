const { MongoClient } = require('mongodb');

async function main() {
    const client = new MongoClient('mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin');
    try {
        await client.connect();
        const db = client.db('cms');
        const locations = db.collection('gaminglocations');
        
        const total = await locations.countDocuments({});
        const active = await locations.countDocuments({
            $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
        });
        const deletedSince2025 = await locations.countDocuments({
            deletedAt: { $gte: new Date('2025-01-01') }
        });
        
        console.log(`Total locations: ${total}`);
        console.log(`Active (shown in CMS): ${active}`);
        console.log(`Deleted since 2025: ${deletedSince2025}`);
        
    } finally {
        await client.close();
    }
}

main().catch(console.error);
