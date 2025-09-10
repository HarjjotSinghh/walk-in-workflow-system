import { HeroSection } from "~/components/landing/HeroSection"
import { ServicesGrid } from "~/components/landing/ServicesGrid"
import { WhyChooseUs } from "~/components/landing/WhyChooseUs"
import { LocationContact } from "~/components/landing/LocationContact"
import { ContactForm } from "~/components/landing/ContactForm"
import { LandingHeader } from "~/components/landing/LandingHeader"
import { LandingFooter } from "~/components/landing/LandingFooter"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <LandingHeader />
      <main>
        <HeroSection />
        <ServicesGrid />
        <WhyChooseUs />
        <LocationContact />
        <ContactForm />
      </main>
      <LandingFooter />
    </div>
  )
}