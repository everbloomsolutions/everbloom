# MongoDB on Kubernetes

The current MongoDB deployment is a single-node StatefulSet backed by an EBS gp3 PersistentVolume.
This provides persistence but is **not highly available**. For production HA, migrate to MongoDB
Atlas or convert the StatefulSet to a MongoDB replica set.

## Automated backups

A daily `CronJob` creates an EBS `VolumeSnapshot` of the `mongodb-data-mongodb-0` PVC at 03:00 UTC.

- `VolumeSnapshotClass`: `gp3-snapshots` (driver `ebs.csi.aws.com`, `deletionPolicy: Retain`)
- `CronJob`: `mongodb-snapshot`
- `ServiceAccount`/`Role`/`RoleBinding`: `mongodb-snapshot`

AWS EBS snapshots are incremental and stored in S3 automatically. Retention is managed on the AWS
side; adjust lifecycle rules in EBS/EC2 or clean old `VolumeSnapshot` objects as needed.

## Manual restore from a VolumeSnapshot

1. Scale the MongoDB StatefulSet to zero:
   ```bash
   kubectl scale statefulset mongodb --replicas=0 -n production
   ```

2. Delete the existing PVC (the PV `reclaimPolicy` must be `Retain` or the snapshot must exist):
   ```bash
   kubectl delete pvc mongodb-data-mongodb-0 -n production
   ```

3. Create a new PVC from the snapshot:
   ```yaml
   apiVersion: v1
   kind: PersistentVolumeClaim
   metadata:
     name: mongodb-data-mongodb-0
     namespace: production
   spec:
     accessModes:
       - ReadWriteOnce
     storageClassName: gp3
     dataSource:
       name: <snapshot-name>
       kind: VolumeSnapshot
       apiGroup: snapshot.storage.k8s.io
     resources:
       requests:
         storage: 50Gi
   ```

4. Scale the StatefulSet back to one:
   ```bash
   kubectl scale statefulset mongodb --replicas=1 -n production
   ```

## Recommended next steps

- Evaluate MongoDB Atlas for managed backups and replica sets.
- If self-hosting, convert the StatefulSet to a replica set with 3 pods, a headless Service, and
  an init container that runs `rs.initiate()` once.
