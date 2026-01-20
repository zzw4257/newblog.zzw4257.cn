import type { ResumeData } from '@/interface/resume'

type Props = {
  data: ResumeData
}

function SectionTitle({ id, index, children }: { id: string; index: number; children: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2
        id={id}
        className="text-xl md:text-2xl font-bold tracking-tight text-base-content scroll-mt-24"
        style={{ animationDelay: `${0.08 + index * 0.06}s` }}
      >
        <span className="resume-section-kicker">{String(index).padStart(2, '0')}</span>
        <span className="ml-2">{children}</span>
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-base-content/10 to-transparent" />
    </div>
  )
}

function Chip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-base-content/15 bg-base-100/60 backdrop-blur text-sm">
      {text}
    </span>
  )
}

export function ResumeViewer({ data }: Props) {
  const p = data.personal

  return (
    <div className="resume-page w-full max-w-4xl mx-auto my-10 md:my-14">
      {/* Header */}
      <div
        className="resume-section resume-header resume-hero rounded-3xl bg-base-100/80 backdrop-blur border border-base-content/10 shadow-2xl overflow-hidden animate-fade-in-up"
        data-resume-hero
      >
        <div className="px-6 md:px-10 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-2">
              <h1 id="resume" className="resume-title text-3xl md:text-5xl font-bold tracking-tight">
                {p.name}
              </h1>
              <div className="resume-subtitle text-base md:text-lg text-base-content/70 font-medium">{p.title}</div>
              {p.bio && <p className="resume-bio mt-4 text-base-content/80 leading-relaxed max-w-2xl">{p.bio}</p>}
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <a className="btn btn-sm btn-outline rounded-full" href={`mailto:${p.email}`}>
                Email
              </a>
              {p.website && (
                <a className="btn btn-sm btn-outline rounded-full" href={p.website} target="_blank" rel="noreferrer">
                  Website
                </a>
              )}
              {(p.social || []).map((s) => (
                <a
                  key={`${s.platform}-${s.url}`}
                  className="btn btn-sm btn-ghost rounded-full"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.platform}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-6 md:mt-8 space-y-6 md:space-y-8">
        {/* Education */}
        {data.education?.length > 0 && (
          <section
            className="resume-section rounded-3xl bg-base-100 shadow-xl border border-base-content/10 p-6 md:p-10"
            style={{ animationDelay: '0.12s' }}
            data-resume-section
          >
            <SectionTitle id="education" index={1}>
              Education
            </SectionTitle>

            <div className="resume-timeline mt-6 space-y-5">
              {data.education.map((e, i) => (
                <div
                  key={`${e.institution}-${e.startDate}-${i}`}
                  className="resume-timeline-item"
                >
                  <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
                    <div className="font-semibold">{e.institution}</div>
                    <div className="text-sm text-base-content/60">
                      {e.startDate} – {e.endDate}
                    </div>
                  </div>
                  <div className="text-base-content/70">
                    {e.degree} · {e.field} · {e.location}
                    {e.gpa ? <span className="ml-2 text-base-content/60">GPA {e.gpa}</span> : null}
                  </div>
                  {e.description && <div className="mt-2 text-base-content/80 leading-relaxed">{e.description}</div>}
                  {e.honors?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {e.honors.map((h) => (
                        <Chip key={h} text={h} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experience */}
        {data.experience?.length > 0 && (
          <section
            className="resume-section rounded-3xl bg-base-100 shadow-xl border border-base-content/10 p-6 md:p-10"
            style={{ animationDelay: '0.18s' }}
            data-resume-section
          >
            <SectionTitle id="experience" index={2}>
              Experience
            </SectionTitle>

            <div className="mt-6 space-y-6">
              {data.experience.map((x, i) => (
                <div
                  key={`${x.company}-${x.startDate}-${i}`}
                  className="resume-card rounded-2xl border border-base-content/10 p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
                    <div className="font-semibold">
                      {x.company} · <span className="text-base-content/70">{x.title}</span>
                    </div>
                    <div className="text-sm text-base-content/60">
                      {x.startDate} – {x.endDate}
                    </div>
                  </div>
                  <div className="text-sm text-base-content/60">{x.location}</div>

                  <div className="mt-3 text-base-content/80 leading-relaxed">
                    <ul className="list-disc pl-5 space-y-1">
                      {String(x.description || '')
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((s, idx) => (
                          <li key={idx}>{s.replace(/^-+\s*/, '')}</li>
                        ))}
                    </ul>
                  </div>

                  {x.technologies?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {x.technologies.map((t) => (
                        <Chip key={t} text={t} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {data.projects?.length > 0 && (
          <section
            className="resume-section rounded-3xl bg-base-100 shadow-xl border border-base-content/10 p-6 md:p-10"
            style={{ animationDelay: '0.24s' }}
            data-resume-section
          >
            <SectionTitle id="projects" index={3}>
              Projects
            </SectionTitle>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.projects.map((x, i) => (
                <div
                  key={`${x.name}-${i}`}
                  className="resume-card rounded-2xl border border-base-content/10 p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold">{x.name}</div>
                    {(x.url || x.github) && (
                      <a
                        className="link link-primary text-sm"
                        href={x.url || x.github}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Link ↗
                      </a>
                    )}
                  </div>
                  <div className="mt-2 text-base-content/75 leading-relaxed">{x.description}</div>
                  {x.highlights?.length ? (
                    <ul className="mt-3 list-disc pl-5 space-y-1 text-base-content/80">
                      {x.highlights.map((h, idx) => (
                        <li key={idx}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                  {x.technologies?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {x.technologies.map((t) => (
                        <Chip key={t} text={t} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {data.skills?.length > 0 && (
          <section
            className="resume-section rounded-3xl bg-base-100 shadow-xl border border-base-content/10 p-6 md:p-10"
            style={{ animationDelay: '0.3s' }}
            data-resume-section
          >
            <SectionTitle id="skills" index={4}>
              Skills
            </SectionTitle>
            <div className="mt-6 space-y-5">
              {data.skills.map((s, i) => (
                <div key={`${s.category}-${i}`} className="flex flex-col md:flex-row md:items-start gap-3">
                  <div className="w-full md:w-56 font-semibold text-base-content/80">{s.category}</div>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {(s.items || []).map((it) => (
                      <Chip key={`${s.category}-${it}`} text={it} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Publications */}
        {data.publications?.length ? (
          <section
            className="resume-section rounded-3xl bg-base-100 shadow-xl border border-base-content/10 p-6 md:p-10"
            style={{ animationDelay: '0.36s' }}
            data-resume-section
          >
            <SectionTitle id="publications" index={5}>
              Publications
            </SectionTitle>
            <ol className="mt-6 space-y-4">
              {data.publications.map((pub, i) => (
                <li key={`${pub.title}-${pub.year}-${i}`} className="rounded-2xl border border-base-content/10 p-5">
                  <div className="font-semibold leading-snug">{pub.title}</div>
                  <div className="mt-1 text-sm text-base-content/70">
                    {(pub.authors || []).join(', ')}
                  </div>
                  <div className="mt-1 text-sm text-base-content/60">
                    {pub.venue} · {pub.year}
                    {pub.type ? <span className="ml-2">({pub.type})</span> : null}
                  </div>
                  {(pub.url || pub.doi) && (
                    <div className="mt-3">
                      <a className="link link-primary text-sm" href={pub.url || pub.doi} target="_blank" rel="noreferrer">
                        Open ↗
                      </a>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Languages / Certifications / Awards */}
        {(data.languages?.length || data.certifications?.length || data.awards?.length) ? (
          <section
            className="resume-section rounded-3xl bg-base-100 shadow-xl border border-base-content/10 p-6 md:p-10"
            style={{ animationDelay: '0.42s' }}
            data-resume-section
          >
            <SectionTitle id="highlights" index={6}>
              Highlights
            </SectionTitle>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-base-content/10 p-5">
                <div className="font-semibold">Languages</div>
                <div className="mt-3 space-y-2">
                  {(data.languages || []).map((l) => (
                    <div key={`${l.name}-${l.level}`} className="flex items-center justify-between gap-3">
                      <div className="text-base-content/80">{l.name}</div>
                      <div className="text-sm text-base-content/60">{l.level}</div>
                    </div>
                  ))}
                  {!data.languages?.length && <div className="text-sm text-base-content/50">—</div>}
                </div>
              </div>

              <div className="rounded-2xl border border-base-content/10 p-5">
                <div className="font-semibold">Certifications</div>
                <div className="mt-3 space-y-2">
                  {(data.certifications || []).map((c) => (
                    <div key={`${c.name}-${c.date}`} className="text-sm leading-relaxed">
                      <div className="text-base-content/80">{c.name}</div>
                      <div className="text-base-content/60">{c.issuer} · {c.date}</div>
                      {c.url ? (
                        <a className="link link-primary" href={c.url} target="_blank" rel="noreferrer">
                          Link ↗
                        </a>
                      ) : null}
                    </div>
                  ))}
                  {!data.certifications?.length && <div className="text-sm text-base-content/50">—</div>}
                </div>
              </div>

              <div className="rounded-2xl border border-base-content/10 p-5">
                <div className="font-semibold">Awards</div>
                <div className="mt-3 space-y-2">
                  {(data.awards || []).map((a) => (
                    <div key={`${a.name}-${a.date}`} className="text-sm leading-relaxed">
                      <div className="text-base-content/80">{a.name}</div>
                      <div className="text-base-content/60">{a.issuer} · {a.date}</div>
                      {a.description ? <div className="text-base-content/70">{a.description}</div> : null}
                    </div>
                  ))}
                  {!data.awards?.length && <div className="text-sm text-base-content/50">—</div>}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

