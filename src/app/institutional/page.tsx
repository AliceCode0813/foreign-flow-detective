import { InvestorDashboard } from "@/components/dashboard/InvestorDashboard";

export const revalidate = 600;

interface InstitutionalPageProps {
  searchParams: Promise<{
    rankMarket?: string;
    streakMarket?: string;
  }>;
}

export default async function InstitutionalPage({ searchParams }: InstitutionalPageProps) {
  return (
    <InvestorDashboard
      investorType="INSTITUTION"
      title="기관 매매 동향"
      pathname="/institutional"
      searchParams={searchParams}
    />
  );
}
