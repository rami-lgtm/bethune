import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Bot, Cpu, Globe, Radio, Shield, Zap } from "lucide-react";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Enable animations only after hydration to prevent flash
    ref.current?.setAttribute("data-hydrated", "");
  }, []);

  return (
    <div ref={ref} className="bg-bethune-cream">
      <Nav />
      <Hero />
      <TransformSection />
      <FeatureBlocks />
      <SpecsSection />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-10">
        <a
          href="/"
          className="text-lg font-semibold tracking-tight text-bethune-black"
        >
          Bethune
        </a>
        <div className="hidden items-center gap-10 md:flex">
          <a
            href="#features"
            className="text-sm text-bethune-gray transition-colors hover:text-bethune-black"
          >
            Features
          </a>
          <a
            href="#specs"
            className="text-sm text-bethune-gray transition-colors hover:text-bethune-black"
          >
            Specs
          </a>
          <a
            href="#about"
            className="text-sm text-bethune-gray transition-colors hover:text-bethune-black"
          >
            About
          </a>
        </div>
        <a
          href="/dashboard"
          className="rounded-full bg-bethune-warm px-5 py-2 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95"
        >
          Dashboard
        </a>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bethune-cream px-6 pt-20">
      {/* Subtle background accent */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-10%] top-[-10%] size-[600px] rounded-full bg-bethune-warm/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] size-[500px] rounded-full bg-bethune-black/3 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl text-center">
        <p className="animate-fade-in-up mb-6 text-sm font-medium uppercase tracking-widest text-bethune-warm">
          Introducing Bethune
        </p>
        <h1 className="animate-fade-in-up-delay-1 text-6xl font-bold leading-[1.05] tracking-tight text-bethune-black sm:text-8xl lg:text-9xl">
          Your robots.
          <br />
          One brain.
        </h1>
        <p className="animate-fade-in-up-delay-2 mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-bethune-gray sm:text-xl">
          The unified command center for every robot in your home. Orchestrate,
          automate, and control — from anywhere.
        </p>
        <div className="animate-fade-in-up-delay-3 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#get-started"
            className="inline-flex items-center gap-2 rounded-full bg-bethune-warm px-8 py-4 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95"
          >
            Request Early Access
          </a>
          <a
            href="#features"
            className="group inline-flex items-center gap-2 text-sm font-medium text-bethune-black transition-colors hover:text-bethune-warm"
          >
            Learn more
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="animate-fade-in-delay-1 absolute bottom-10 flex flex-col items-center gap-2">
        <span className="text-xs text-bethune-muted">Scroll to explore</span>
        <div className="h-8 w-px bg-gradient-to-b from-bethune-muted/50 to-transparent" />
      </div>
    </section>
  );
}

function TransformSection() {
  return (
    <section className="bg-white py-32 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="mb-6 text-sm font-medium uppercase tracking-widest text-bethune-warm">
              Transform your home
            </p>
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-bethune-black sm:text-5xl lg:text-6xl">
              A smarter home
              <br />
              starts here.
            </h2>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-bethune-gray">
              Bethune connects every robot in your home under a single
              intelligent layer. No more switching between apps. No more missed
              automations. Just one calm, unified experience.
            </p>
            <a
              href="#features"
              className="group mt-10 inline-flex items-center gap-2 text-sm font-medium text-bethune-warm transition-colors hover:text-bethune-black"
            >
              Explore features
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          {/* Abstract visual instead of image */}
          <div className="relative aspect-square w-full">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-bethune-cream to-white border border-bethune-black/5" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative size-64">
                <div className="absolute inset-0 rounded-full border border-bethune-black/5" />
                <div className="absolute inset-8 rounded-full border border-bethune-warm/10" />
                <div className="absolute inset-16 rounded-full border border-bethune-warm/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-16 rounded-full bg-bethune-warm/10 flex items-center justify-center">
                    <Bot className="size-7 text-bethune-warm" />
                  </div>
                </div>
                {/* Orbiting nodes */}
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="size-10 rounded-full bg-white border border-bethune-black/5 shadow-sm flex items-center justify-center">
                    <Radio className="size-4 text-bethune-gray" />
                  </div>
                </div>
                <div className="absolute right-0 top-1/4 translate-x-1/2 -translate-y-1/2">
                  <div className="size-10 rounded-full bg-white border border-bethune-black/5 shadow-sm flex items-center justify-center">
                    <Cpu className="size-4 text-bethune-gray" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-1/3 translate-y-1/2">
                  <div className="size-10 rounded-full bg-white border border-bethune-black/5 shadow-sm flex items-center justify-center">
                    <Shield className="size-4 text-bethune-gray" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureBlocks() {
  const features = [
    {
      icon: Radio,
      label: "Control",
      title: "Real-time, every time.",
      description:
        "Sub-50ms latency between your command and robot action. Every gesture, every instruction — instant. Whether you're in the same room or across the world.",
    },
    {
      icon: Cpu,
      label: "Intelligence",
      title: "Routines that learn.",
      description:
        "Bethune observes your patterns and suggests automations that actually make sense. Morning coffee, evening lights, weekly vacuuming — all handled.",
    },
    {
      icon: Shield,
      label: "Security",
      title: "Private by design.",
      description:
        "End-to-end encryption with local-first processing. Your home data never leaves your control. No cloud dependencies for core functionality.",
    },
    {
      icon: Globe,
      label: "Universal",
      title: "Any robot. One place.",
      description:
        "Universal protocol support for vacuum bots, lawn mowers, kitchen assistants, security drones, and more. If it moves, Bethune can manage it.",
    },
  ];

  return (
    <section id="features" className="bg-bethune-cream py-32 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="mb-24 max-w-3xl">
          <p className="mb-6 text-sm font-medium uppercase tracking-widest text-bethune-warm">
            Capabilities
          </p>
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-bethune-black sm:text-5xl lg:text-6xl">
            Everything your robots need.
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.label}
              className="group rounded-3xl bg-white border border-bethune-black/5 p-10 lg:p-14 transition-colors hover:border-bethune-warm/20"
            >
              <div className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-bethune-cream">
                <feature.icon className="size-6 text-bethune-warm" />
              </div>
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-bethune-muted">
                {feature.label}
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-bethune-black sm:text-3xl">
                {feature.title}
              </h3>
              <p className="mt-4 max-w-md text-base leading-relaxed text-bethune-gray">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpecsSection() {
  const specs = [
    { label: "Command latency", value: "<50ms" },
    { label: "Platform uptime", value: "99.9%" },
    { label: "Supported robots", value: "200+" },
    { label: "Encryption", value: "E2E" },
    { label: "Protocols", value: "BLE, WiFi, Zigbee, Z-Wave" },
    { label: "Platforms", value: "Web, iOS, Android, CLI" },
  ];

  return (
    <section id="specs" className="bg-white py-32 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="mb-20">
          <p className="mb-6 text-sm font-medium uppercase tracking-widest text-bethune-warm">
            Specifications
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-bethune-black sm:text-5xl">
            Built for performance.
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden rounded-3xl bg-bethune-black/5 sm:grid-cols-2 lg:grid-cols-3">
          {specs.map((spec) => (
            <div
              key={spec.label}
              className="bg-white p-10 transition-colors hover:bg-bethune-cream"
            >
              <p className="text-sm text-bethune-muted">{spec.label}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-bethune-black">
                {spec.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section
      id="get-started"
      className="relative overflow-hidden bg-bethune-black py-32 lg:py-40"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 size-96 rounded-full bg-bethune-warm/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-96 rounded-full bg-bethune-warm/3 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Ready to orchestrate?
        </h2>
        <p className="mx-auto mt-8 max-w-lg text-lg leading-relaxed text-white/50">
          Join the waitlist for early access. Be among the first to bring
          unified intelligence to your home robots.
        </p>
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-bethune-warm sm:w-80"
          />
          <button className="w-full rounded-full bg-bethune-warm px-8 py-4 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95 sm:w-auto">
            Join Waitlist
          </button>
        </div>
        <p className="mt-6 text-xs text-white/25">
          No spam. We'll only email you when Bethune is ready.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-bethune-black border-t border-white/5 py-10">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <span className="text-sm font-semibold text-white/60">Bethune</span>
          <div className="flex items-center gap-8">
            <a
              href="#"
              className="text-xs text-white/30 transition-colors hover:text-white/50"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-xs text-white/30 transition-colors hover:text-white/50"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-xs text-white/30 transition-colors hover:text-white/50"
            >
              Contact
            </a>
          </div>
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} Bethune Robotics
          </p>
        </div>
      </div>
    </footer>
  );
}
