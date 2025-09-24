import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        <div className="container mx-auto px-4 py-24 text-center">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Your Blank
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Canvas</span>
            </h1>
            <p className="mb-8 text-xl text-muted-foreground md:text-2xl">
              A beautiful foundation ready for your next amazing project.
              <br />
              Start building something extraordinary.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button variant="default" size="lg" className="shadow-elegant">
                Get Started
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to Build</h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to create something amazing is already here.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-0 bg-gradient-secondary p-8 shadow-elegant transition-all duration-300 hover:shadow-glow">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <div className="h-6 w-6 rounded bg-primary" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Modern Design</h3>
              <p className="text-muted-foreground">
                Clean, responsive design system with beautiful components ready to customize.
              </p>
            </Card>
            <Card className="border-0 bg-gradient-secondary p-8 shadow-elegant transition-all duration-300 hover:shadow-glow">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <div className="h-6 w-6 rounded bg-primary" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Developer Ready</h3>
              <p className="text-muted-foreground">
                TypeScript, React, and Tailwind CSS configured and ready to go.
              </p>
            </Card>
            <Card className="border-0 bg-gradient-secondary p-8 shadow-elegant transition-all duration-300 hover:shadow-glow">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <div className="h-6 w-6 rounded bg-primary" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Fully Customizable</h3>
              <p className="text-muted-foreground">
                Every component and style can be tailored to match your vision.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <Card className="border-0 bg-gradient-primary p-12 text-center shadow-elegant">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
              Start Building Today
            </h2>
            <p className="mb-8 text-lg text-primary-foreground/80">
              Your blank canvas is ready. What will you create?
            </p>
            <Button variant="secondary" size="lg" className="shadow-lg">
              Begin Your Project
            </Button>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default Index;
