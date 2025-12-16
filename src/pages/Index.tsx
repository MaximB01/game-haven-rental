import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import GamesSection from "@/components/home/GamesSection";
import StatsSection from "@/components/home/StatsSection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <FeaturesSection />
      <GamesSection />
      <StatsSection />
    </Layout>
  );
};

export default Index;
