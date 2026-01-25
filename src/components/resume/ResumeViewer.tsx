import type { ResumeData } from '@/interface/resume'

type Props = {
  data: ResumeData
}

export function ResumeViewer({ data }: Props) {
  return (
    <div className="resume-page w-full max-w-7xl mx-auto my-10 md:my-14">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-3xl md:text-4xl font-bold">正在施工中</h1>
        <p className="text-lg text-base-content/70 max-w-md">
          Resume is under construction, please stay tuned...
        </p>
      </div>
    </div>
  )
}
