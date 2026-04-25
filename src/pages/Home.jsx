import PageTransition from '../components/PageTransition.jsx'
import Card from '../components/Card.jsx'
import ArchDiagram from '../components/ArchDiagram.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { META, MODEL, RESULTS, DATASETS } from '../data/results.js'

export default function Home() {
  const toast = useToast()

  async function exportPDF() {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210, M = 18
      let y = M

      doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
      doc.setTextColor(30, 58, 138)
      const titleLines = doc.splitTextToSize(META.thesisTitle, W - 2 * M)
      doc.text(titleLines, M, y); y += titleLines.length * 6 + 2

      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.setTextColor(60)
      doc.text(`${META.author}  ·  ${META.studentId}`, M, y); y += 5
      doc.text(`Supervisor: ${META.supervisor}`, M, y); y += 5
      doc.text(`${META.college}, ${META.university}  ·  ${META.academicYear}`, M, y); y += 8

      doc.setDrawColor(13, 148, 136); doc.setLineWidth(0.5)
      doc.line(M, y, W - M, y); y += 6

      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 58, 138)
      doc.text('Abstract', M, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(40)
      const abs =
        'This thesis presents an empirical study of Differentially Private SGD applied to two MedMNIST v2 ' +
        'benchmarks — BloodMNIST (8 classes) and PathMNIST (9 classes) — using a compact CNN (MedCNN, ' +
        '814,056 parameters) with GroupNorm for Opacus compatibility. Utility is evaluated under δ = 10⁻⁵ ' +
        'across ε ∈ {1, 4, 8}. RGP and GEP are discussed as theoretical comparisons only (†). Larger datasets ' +
        'substantially mitigate DP-induced accuracy loss: PathMNIST loses ~4.6 pp at ε = 8 while BloodMNIST loses ~16 pp. ' +
        'An optimal clipping band C ∈ [1.0, 2.0] is identified, with C = 1.5 reported in Table 2.'
      const absLines = doc.splitTextToSize(abs, W - 2 * M)
      doc.text(absLines, M, y); y += absLines.length * 4.5 + 4

      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 58, 138)
      doc.text('Key results (test accuracy, %)', M, y); y += 6

      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(40)
      const cols = ['Dataset', 'Baseline', 'ε = 1', 'ε = 4', 'ε = 8']
      const xs = [M, M + 38, M + 70, M + 100, M + 130]
      cols.forEach((c, i) => doc.text(c, xs[i], y))
      y += 1; doc.line(M, y, W - M, y); y += 5
      Object.entries(RESULTS).forEach(([d, r]) => {
        doc.text(d, xs[0], y)
        doc.text(`${r.Baseline.acc.toFixed(2)}`, xs[1], y)
        doc.text(`${r['DP-SGD ε=1'].acc.toFixed(2)}`, xs[2], y)
        doc.text(`${r['DP-SGD ε=4'].acc.toFixed(2)}`, xs[3], y)
        doc.text(`${r['DP-SGD ε=8'].acc.toFixed(2)}`, xs[4], y)
        y += 5
      })
      y += 4

      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 58, 138)
      doc.text('Setup', M, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(40)
      const setup = [
        `Model: ${MODEL.name}, ${MODEL.params.toLocaleString()} parameters, ${MODEL.norm}.`,
        `Framework: ${MODEL.framework} · Accountant: ${MODEL.accountant} · δ = ${MODEL.delta.toExponential(0)}.`,
        `Datasets: BloodMNIST (${DATASETS.BloodMNIST.trainSize.toLocaleString()} train) and ` +
          `PathMNIST (${DATASETS.PathMNIST.trainSize.toLocaleString()} train).`,
        'RGP and GEP discussed for theoretical comparison only (†); not empirically re-implemented.'
      ]
      setup.forEach(line => {
        const ll = doc.splitTextToSize(line, W - 2 * M)
        doc.text(ll, M, y); y += ll.length * 4.5 + 1
      })

      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(120)
      doc.text(
        'Auto-generated from the thesis demo website — values mirror Table 1 of the thesis.',
        M, 285
      )

      doc.save('dp-medical-summary.pdf')
      toast.success('Downloaded one-page PDF summary')
    } catch (e) {
      toast.error(`PDF export failed: ${e.message}`)
    }
  }

  return (
    <PageTransition>
      <div className="grid gap-6">
        <Card>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-brand-teal font-semibold mb-2">
                Bachelor Thesis · {META.academicYear}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-brand-navy leading-tight">
                {META.thesisTitle}
              </h1>
            </div>
            <button
              onClick={exportPDF}
              className="px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-medium hover:bg-brand-navyDeep"
            >
              Download one-page PDF
            </button>
          </div>
          <dl className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500 text-xs uppercase tracking-wider">Author</dt>
              <dd className="font-medium text-slate-900">{META.author}</dd>
            </div>
            <div>
              <dt className="text-slate-500 text-xs uppercase tracking-wider">Student ID</dt>
              <dd className="font-mono text-slate-900">{META.studentId}</dd>
            </div>
            <div>
              <dt className="text-slate-500 text-xs uppercase tracking-wider">Supervisor</dt>
              <dd className="font-medium text-slate-900">{META.supervisor}</dd>
            </div>
            <div>
              <dt className="text-slate-500 text-xs uppercase tracking-wider">College</dt>
              <dd className="font-medium text-slate-900">{META.college}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Abstract">
          <p className="text-sm leading-relaxed text-slate-700">
            Medical image classification increasingly relies on deep neural networks, yet training on sensitive
            patient data exposes individuals to membership-inference and gradient-leakage attacks. This thesis
            presents an empirical study of Differentially Private Stochastic Gradient Descent (DP-SGD) applied to
            two MedMNIST v2 benchmarks — BloodMNIST (8 classes) and PathMNIST (9 classes) — using a compact CNN
            (MedCNN, 814,056 parameters) with GroupNorm for Opacus compatibility. Utility is evaluated under a fixed
            δ = 10⁻⁵ across ε ∈ &#123;1, 4, 8&#125;. Reparameterized Gradient Perturbation (RGP) and Gradient
            Embedding Perturbation (GEP) are discussed as theoretical comparisons only (†). Results indicate that
            larger datasets substantially mitigate DP-induced accuracy loss — PathMNIST loses ≈ 4.6 pp at ε = 8
            while BloodMNIST loses ≈ 16 pp — and an optimal clipping band C ∈ [1.0, 2.0] is identified.
          </p>
        </Card>

        <Card title="System architecture" subtitle="End-to-end pipeline — Figure 7 of the thesis">
          <ArchDiagram />
        </Card>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Model"         value={MODEL.name}       foot={`${MODEL.params.toLocaleString()} params`} />
          <Stat label="Normalisation" value="GroupNorm"        foot="8 groups · Opacus-compatible" />
          <Stat label="Accountant"    value={MODEL.accountant} foot={`δ = ${MODEL.delta.toExponential(0)}`} />
          <Stat label="Framework"     value={MODEL.framework}  foot="PyTorch DP-SGD" />
        </div>
      </div>
    </PageTransition>
  )
}

function Stat({ label, value, foot }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-brand-navy">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{foot}</div>
    </div>
  )
}