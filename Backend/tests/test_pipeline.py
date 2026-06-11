import asyncio
from jobs_pipeline import fetch_live_jobs

async def test():
    print("Testing fetch_live_jobs for target_role: 'developer'...")
    jobs = await fetch_live_jobs("developer")
    print(f"Retrieved {len(jobs)} jobs:")
    for i, job in enumerate(jobs, 1):
        print(f"{i}. {job['title']} - {job['company']} (Tags: {job['required_stack']})")

if __name__ == "__main__":
    asyncio.run(test())
