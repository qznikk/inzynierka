import React, { useEffect, useState } from "react";

export default function LandingPage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-section text-textPrimary">
      {/* ================= HERO ================= */}
      <section className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Order services online.
              <span className="block text-primary">
                Track everything in one place.
              </span>
            </h1>

            <p className="mt-6 text-lg text-textSecondary max-w-xl">
              Use your client account to easily submit service requests, track
              their progress, access reports and invoices, and keep your full
              service history in one clear panel.
            </p>

            <p className="mt-4 text-sm text-textSecondary max-w-xl">
              To get started, create an account or log in using the menu above.
            </p>
          </div>

          <div className="flex justify-center">
            <img
              src={
                isDark ? "/clientdashboard-dark.png" : "/clientdashboard.png"
              }
              alt="Client dashboard preview"
              className="rounded-2xl max-h-96 w-auto border border-borderSoft"
            />
          </div>
        </div>
      </section>

      {/* ================= BENEFITS ================= */}
      <section className="bg-navbar py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-semibold text-textPrimary">
            Why use a client account?
          </h2>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <Benefit
              title="Easy service requests"
              text="Submit service jobs quickly without phone calls or emails."
            />
            <Benefit
              title="Full transparency"
              text="Always know the current status of your service request."
            />
            <Benefit
              title="All documents in one place"
              text="Access reports, invoices and job history anytime."
            />
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-semibold text-textPrimary">
            How it works
          </h2>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <Step number="1" title="Create an account">
              Register once to access your personal client panel.
            </Step>
            <Step number="2" title="Submit a service request">
              Describe the issue and send a job request online.
            </Step>
            <Step number="3" title="Track & review">
              Follow progress, receive reports and manage invoices.
            </Step>
          </div>
        </div>
      </section>

      {/* ================= CLIENT PANEL ================= */}
      <section className="bg-navbar py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-center text-textPrimary">
            Everything available in your client panel
          </h2>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Feature title="Job tracking">
              See the current status of all your service requests.
            </Feature>
            <Feature title="Service reports">
              View detailed reports created after job completion.
            </Feature>
            <Feature title="Invoices">
              Check invoices and confirm payments online.
            </Feature>
            <Feature title="Service history">
              Full history of completed and ongoing services.
            </Feature>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Benefit({ title, text }) {
  return (
    <div className="bg-modal p-6 rounded-2xl border border-borderSoft transition hover:shadow-sm">
      <h3 className="font-semibold text-lg text-primary">{title}</h3>
      <p className="mt-2 text-textSecondary text-sm">{text}</p>
    </div>
  );
}

function Feature({ title, children }) {
  return (
    <div className="bg-modal p-6 rounded-2xl border border-borderSoft transition hover:shadow-sm">
      <h3 className="font-semibold text-primary">{title}</h3>
      <p className="mt-2 text-sm text-textSecondary">{children}</p>
    </div>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="bg-modal p-6 rounded-2xl border border-borderSoft transition hover:shadow-sm text-left">
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-accent text-primary font-bold">
        {number}
      </div>
      <h3 className="mt-4 font-semibold text-primary">{title}</h3>
      <p className="mt-2 text-sm text-textSecondary">{children}</p>
    </div>
  );
}
