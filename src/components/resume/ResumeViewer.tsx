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
    <div className="resume-page w-full max-w-7xl mx-auto my-10 md:my-14">
      {/* Two-column layout: Sidebar + Main */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Sidebar */}
        <aside className="lg:w-80 lg:flex-shrink-0 space-y-6">
          {/* Profile Card */}
          <div className="resume-section rounded-3xl bg-base-100/80 backdrop-blur border border-base-content/10 shadow-xl p-6 animate-fade-in-up">
            <div className="flex flex-col items-center text-center space-y-4">
              {p.avatar && (
                <img
                  src={p.avatar}
                  alt={p.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-base-content/10"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
                <div className="mt-2 text-sm text-base-content/70 whitespace-pre-line">{p.title}</div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="mt-6 space-y-3 text-sm">
              {p.location && (
                <div className="flex items-center gap-2 text-base-content/80">
                  <span className="w-5">📍</span>
                  <span>{p.location}</span>
                </div>
              )}
              {p.phone && (
                <div className="flex items-center gap-2 text-base-content/80">
                  <span className="w-5">📞</span>
                  <a href={`tel:${p.phone}`} className="link link-hover">
                    {p.phone}
                  </a>
                </div>
              )}
              {p.email && (
                <div className="flex items-center gap-2 text-base-content/80">
                  <span className="w-5">✉️</span>
                  <a href={`mailto:${p.email}`} className="link link-hover break-all">
                    {p.email}
                  </a>
                </div>
              )}
              {p.website && (
                <div className="flex items-center gap-2 text-base-content/80">
                  <span className="w-5">🌐</span>
                  <a href={p.website} target="_blank" rel="noreferrer" className="link link-hover break-all">
                    {p.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {(p.social || []).map((s) => (
                <div key={`${s.platform}-${s.url}`} className="flex items-center gap-2 text-base-content/80">
                  <span className="w-5">🔗</span>
                  <a href={s.url} target="_blank" rel="noreferrer" className="link link-hover">
                    {s.platform}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Research Interests */}
          {data.researchInterests && data.researchInterests.length > 0 && (
            <div className="resume-section rounded-3xl bg-base-100/80 backdrop-blur border border-base-content/10 shadow-xl p-6 animate-fade-in-up" style={{ animationDelay: '0.06s' }}>
              <h3 className="font-bold text-base mb-3">Research Interests</h3>
              <ul className="space-y-2 text-sm">
                {data.researchInterests.map((interest, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-base-content/80">{interest}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          {data.skills && data.skills.length > 0 && (
            <div className="resume-section rounded-3xl bg-base-100/80 backdrop-blur border border-base-content/10 shadow-xl p-6 animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
              <h3 className="font-bold text-base mb-4">Technical Skills</h3>
              <div className="space-y-4">
                {data.skills.map((skill, i) => (
                  <div key={i}>
                    <div className="font-semibold text-sm mb-2">{skill.category}:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {skill.items.map((item) => (
                        <Chip key={item} text={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {data.languages && data.languages.length > 0 && (
            <div className="resume-section rounded-3xl bg-base-100/80 backdrop-blur border border-base-content/10 shadow-xl p-6 animate-fade-in-up" style={{ animationDelay: '0.18s' }}>
              <h3 className="font-bold text-base mb-3">Languages</h3>
              <div className="space-y-2 text-sm">
                {data.languages.map((lang, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-base-content/80">{lang.name}</span>
                    <span className="text-base-content/60">{lang.level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Algorithmic Skill */}
          {data.algorithmicSkill && data.algorithmicSkill.length > 0 && (
            <div className="resume-section rounded-3xl bg-base-100/80 backdrop-blur border border-base-content/10 shadow-xl p-6 animate-fade-in-up" style={{ animationDelay: '0.24s' }}>
              <h3 className="font-bold text-base mb-3">Algorithmic Skill</h3>
              <div className="space-y-2 text-sm">
                {data.algorithmicSkill.map((skill, i) => (
                  <div key={i}>
                    <div className="font-semibold text-base-content/80">{skill.platform}</div>
                    {skill.rating && <div className="text-base-content/60">Rating: {skill.rating}</div>}
                    {skill.achievement && <div className="text-base-content/60">{skill.achievement}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-6 md:space-y-8">
          {/* Education */}
          {data.education && data.education.length > 0 && (
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
                  <div key={`${e.institution}-${e.startDate}-${i}`} className="resume-timeline-item">
                    <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
                      <div className="font-semibold text-lg">{e.institution}</div>
                      <div className="text-sm text-base-content/60">
                        {e.startDate} – {e.endDate}
                      </div>
                    </div>
                    <div className="text-base-content/70 mt-1">
                      {e.degree} in {e.field}
                      {e.location && <span className="ml-2">· {e.location}</span>}
                    </div>
                    {e.program && (
                      <div className="text-base-content/80 mt-2 font-medium">{e.program}</div>
                    )}
                    {e.eliteProgram && (
                      <div className="text-base-content/70 mt-1 text-sm">Elite Program: {e.eliteProgram}</div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      {e.gpa && <span className="text-base-content/80"><strong>GPA:</strong> {e.gpa}</span>}
                      {e.avgScore && <span className="text-base-content/80"><strong>Avg Score:</strong> {e.avgScore}</span>}
                    </div>
                    {e.keyCourses && e.keyCourses.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-semibold text-base-content/80 mb-2">Key Courses:</div>
                        <div className="flex flex-wrap gap-2">
                          {e.keyCourses.map((course, idx) => (
                            <span key={idx} className="text-sm text-base-content/70">
                              {course.name} ({course.score})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Research Experience */}
          {data.researchExperience && data.researchExperience.length > 0 && (
            <section
              className="resume-section rounded-3xl bg-base-100 shadow-xl border border-base-content/10 p-6 md:p-10"
              style={{ animationDelay: '0.18s' }}
              data-resume-section
            >
              <SectionTitle id="research" index={2}>
                Research Experience
              </SectionTitle>

              <div className="mt-6 space-y-6">
                {data.researchExperience.map((r, i) => (
                  <div key={`${r.title}-${r.startDate}-${i}`} className="resume-card rounded-2xl border border-base-content/10 p-5">
                    <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
                      <div>
                        <div className="font-semibold text-lg">{r.title}</div>
                        {r.subtitle && <div className="text-sm text-base-content/70 mt-1">{r.subtitle}</div>}
                        {r.affiliation && <div className="text-sm text-base-content/60 mt-1">{r.affiliation}</div>}
                      </div>
                      <div className="text-sm text-base-content/60 whitespace-nowrap">
                        {r.startDate} – {r.endDate}
                      </div>
                    </div>
                    {r.role && (
                      <div className="mt-2 text-sm font-medium text-primary">{r.role}</div>
                    )}
                    <div className="mt-3 text-base-content/80 leading-relaxed">{r.description}</div>
                    {r.highlights && r.highlights.length > 0 && (
                      <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm text-base-content/80">
                        {r.highlights.map((h, idx) => (
                          <li key={idx} dangerouslySetInnerHTML={{ __html: h }} />
                        ))}
                      </ul>
                    )}
                    {r.status && (
                      <div className="mt-3">
                        <Chip text={r.status === 'preparing' ? 'Preparing for Submission' : r.status} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {data.projects && data.projects.length > 0 && (
            <section
              className="resume-section rounded-3xl bg-base-100 shadow-xl border border-base-content/10 p-6 md:p-10"
              style={{ animationDelay: '0.24s' }}
              data-resume-section
            >
              <SectionTitle id="projects" index={3}>
                Selected Projects
              </SectionTitle>

              <div className="mt-6 grid grid-cols-1 gap-4">
                {data.projects.map((x, i) => (
                  <div
                    key={`${x.name}-${i}`}
                    className="resume-card rounded-2xl border border-base-content/10 p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{x.name}</div>
                        {x.context && <div className="text-sm text-base-content/60 mt-1">{x.context}</div>}
                      </div>
                      {(x.url || x.github) && (
                        <a
                          className="link link-primary text-sm whitespace-nowrap"
                          href={x.url || x.github}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Link ↗
                        </a>
                      )}
                    </div>
                    <div className="mt-2 text-base-content/75 leading-relaxed" dangerouslySetInnerHTML={{ __html: x.description }} />
                    {x.highlights && x.highlights.length > 0 && (
                      <ul className="mt-3 list-disc pl-5 space-y-1 text-sm text-base-content/80">
                        {x.highlights.map((h, idx) => (
                          <li key={idx} dangerouslySetInnerHTML={{ __html: h }} />
                        ))}
                      </ul>
                    )}
                    {x.technologies && x.technologies.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {x.technologies.map((t) => (
                          <Chip key={t} text={t} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Awards & Honors */}
          {data.awards && data.awards.length > 0 && (
            <section
              className="resume-section rounded-3xl bg-base-100 shadow-xl border border-base-content/10 p-6 md:p-10"
              style={{ animationDelay: '0.3s' }}
              data-resume-section
            >
              <SectionTitle id="awards" index={4}>
                Honors & Awards
              </SectionTitle>
              <div className="mt-6 space-y-3">
                {data.awards.map((a, i) => (
                  <div key={`${a.name}-${a.date}-${i}`} className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1 py-2 border-b border-base-content/5 last:border-0">
                    <div className="font-semibold text-base-content/90">{a.name}</div>
                    <div className="text-sm text-base-content/60">
                      {a.issuer} · {a.date}
                      {a.note && <span className="ml-2 text-base-content/50">({a.note})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Leadership */}
          {data.leadership && data.leadership.length > 0 && (
            <section
              className="resume-section rounded-3xl bg-base-100 shadow-xl border border-base-content/10 p-6 md:p-10"
              style={{ animationDelay: '0.36s' }}
              data-resume-section
            >
              <SectionTitle id="leadership" index={5}>
                Leadership
              </SectionTitle>
              <div className="mt-6 space-y-5">
                {data.leadership.map((l, i) => (
                  <div key={`${l.title}-${i}`} className="resume-card rounded-2xl border border-base-content/10 p-5">
                    <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
                      <div className="font-semibold">{l.title}</div>
                      {l.startDate && (
                        <div className="text-sm text-base-content/60">
                          {l.startDate}
                          {l.endDate && ` – ${l.endDate}`}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-base-content/70 mt-1">{l.organization} · {l.location}</div>
                    <div className="mt-2 text-base-content/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: l.description }} />
                    {l.awards && l.awards.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {l.awards.map((award, idx) => (
                          <Chip key={idx} text={award} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
