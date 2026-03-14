"use client";

type Testimonial = {
  name: string;
  role: string;
  text: string;
};

type TestimonialsSectionProps = {
  items: Testimonial[];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TestimonialsSection({ items }: TestimonialsSectionProps) {
  return (
    <section
      id="testimonials"
      className="bg-[var(--bg-card2)] border-y border-[var(--border)] py-24 overflow-hidden scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Co mówią nasi użytkownicy</h2>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
            Opinie od domowych producentów, którzy używają TL Meter do szybkiej
            weryfikacji miksu przed publikacją i masteringiem.
          </p>
        </div>
        <div
          className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-2 hide-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item) => (
            <div
              key={item.name}
              className="w-[280px] md:w-[320px] snap-center card p-6 bg-[var(--bg-surface)] shrink-0 flex flex-col justify-between h-auto"
            >
              <div>
                <div className="flex text-[var(--accent)] mb-3 text-sm">★★★★★</div>
                <p className="text-sm text-[var(--text-secondary)] italic mb-6 leading-relaxed">
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-4 border-t border-[var(--border)] pt-4 mt-auto">
                <div className="w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                  {getInitials(item.name)}
                </div>
                <div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">{item.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2 mt-4">
          <div className="w-4 h-2 rounded-full bg-[var(--accent)] transition-all"></div>
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full bg-[var(--border)] hover:bg-[var(--text-muted)] transition-all cursor-pointer"
            ></div>
          ))}
        </div>
      </div>
    </section>
  );
}
