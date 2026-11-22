#!/usr/bin/env python3
"""
PKL Player Photos S3 / CloudFront Sync Script
==============================================
This optional script synchronizes processed PKL player WebP portraits (600x750)
to an Amazon S3 bucket behind CloudFront or any S3-compatible object store (e.g. Cloudflare R2, MinIO).

Usage:
  python scripts/upload_pkl_images_s3.py --bucket my-sports-assets --prefix pkl-players --region ap-south-1

Environment variables:
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_DEFAULT_REGION (default: ap-south-1)
  S3_BUCKET_NAME (optional fallback)
"""

import os
import sys
import argparse
import glob

def main():
    parser = argparse.ArgumentParser(description="Upload PKL Player Photos to S3/CloudFront")
    parser.add_argument("--bucket", default=os.getenv("S3_BUCKET_NAME"), help="S3 bucket name")
    parser.add_argument("--prefix", default="pkl-players", help="Key prefix in bucket (e.g. pkl-players)")
    parser.add_argument("--region", default=os.getenv("AWS_DEFAULT_REGION", "ap-south-1"), help="AWS region")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without uploading")
    
    args = parser.parse_args()
    
    if not args.bucket and not args.dry_run:
        print("[ERROR] Please provide --bucket <bucket-name> or set S3_BUCKET_NAME env var.")
        print("Example: python scripts/upload_pkl_images_s3.py --bucket my-assets-bucket --prefix pkl-players")
        sys.exit(1)
        
    local_dir = os.path.join("public", "images", "pkl-players")
    if not os.path.isdir(local_dir):
        print(f"[ERROR] Local directory {local_dir} not found.")
        sys.exit(1)
        
    webp_files = sorted(glob.glob(os.path.join(local_dir, "*.webp")))
    print(f"[PKL S3 UPLOADER] Found {len(webp_files)} player portraits in {local_dir}")
    
    if args.dry_run:
        print(f"[DRY RUN] Would upload {len(webp_files)} images to s3://{args.bucket}/{args.prefix}/")
        for f in webp_files[:5]:
            fname = os.path.basename(f)
            print(f"  -> s3://{args.bucket}/{args.prefix}/{fname} (Content-Type: image/webp, Cache-Control: max-age=31536000, public)")
        print(f"  ... and {len(webp_files) - 5} more files.")
        return

    try:
        import boto3
        s3 = boto3.client('s3', region_name=args.region)
    except ImportError:
        print("[ERROR] boto3 library not installed. Install with: pip install boto3")
        sys.exit(1)
        
    uploaded_count = 0
    for f in webp_files:
        fname = os.path.basename(f)
        s3_key = f"{args.prefix}/{fname}".lstrip('/')
        try:
            s3.upload_file(
                f,
                args.bucket,
                s3_key,
                ExtraArgs={
                    'ContentType': 'image/webp',
                    'CacheControl': 'max-age=31536000, public, immutable'
                }
            )
            uploaded_count += 1
            if uploaded_count % 25 == 0 or uploaded_count == len(webp_files):
                print(f"  Uploaded [{uploaded_count}/{len(webp_files)}] {fname} -> s3://{args.bucket}/{s3_key}")
        except Exception as e:
            print(f"  [FAILED] {fname}: {e}")
            
    print(f"\n[DONE] Successfully uploaded {uploaded_count} images to s3://{args.bucket}/{args.prefix}/")
    print("\nNext step: Set NEXT_PUBLIC_PKL_IMAGE_BASE_URL in your hosting dashboard (Netlify/Render):")
    print(f"NEXT_PUBLIC_PKL_IMAGE_BASE_URL=\"https://your-cloudfront-distribution.net/{args.prefix}\"")

if __name__ == "__main__":
    main()
