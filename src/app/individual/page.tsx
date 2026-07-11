import { InvestorDashboard } from "@/components/dashboard/InvestorDashboard";

export const revalidate = 300;

interface IndividualPageProps {
  searchParams: Promise<{
    rankMarket?: string;
    streakMarket?: string;
  }>;
}

export default async function IndividualPage({ searchParams }: IndividualPageProps) {
  return (
    <InvestorDashboard
      investorType="INDIVIDUAL"
      title="개인 매매 동향"
      pathname="/individual"
      searchParams={searchParams}
    />
  );
}
