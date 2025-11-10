# Restore Instructions

## Backup Details
- **Timestamp:** 2025-11-10T15:04:26-04:00
- **Total Collections:** 3
- **Backup Directory:** backups\2025-11-10T15-04-26-000Z

## Collections Backed Up
- machines: 2536 documents
- collectionreports: 4568 documents
- collections: 41660 documents

## How to Restore

### Using mongoimport:
`bash
mongoimport --uri="$MONGO_URI" --collection=machines --file=backups\2025-11-10T15-04-26-000Z/machines.json --jsonArray --drop
mongoimport --uri="$MONGO_URI" --collection=collections --file=backups\2025-11-10T15-04-26-000Z/collections.json --jsonArray --drop
mongoimport --uri="$MONGO_URI" --collection=collectionreports --file=backups\2025-11-10T15-04-26-000Z/collectionreports.json --jsonArray --drop
`

⚠️ The --drop flag will DELETE existing data before restoring!
