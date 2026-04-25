import PageTransition from '../components/PageTransition.jsx'
import Card from '../components/Card.jsx'

export default function About() {
  return (
    <PageTransition>
      <div className="grid gap-6">
        <Card title="Differential Privacy — formal definition">
          <p className="text-sm text-slate-700 leading-relaxed">
            A randomised mechanism <em>M : D → R</em> is (ε, δ)-differentially private if, for every pair of
            neighbouring datasets <em>D</em>, <em>D′</em> differing in a single record and every measurable{' '}
            <em>S ⊆ R</em>:
          </p>
          <pre className="math-block mt-3">
{`Pr[ M(D)  ∈ S ]  ≤  exp(ε) · Pr[ M(D′) ∈ S ]  +  δ`}
          </pre>
          <p className="text-sm text-slate-700 mt-3 leading-relaxed">
            ε bounds the multiplicative privacy loss; δ bounds the probability of an unbounded breach. Smaller ε ⇒
            stronger privacy. This thesis fixes δ = 10⁻⁵ and varies ε ∈ &#123;1, 4, 8&#125;.
          </p>
        </Card>

        <Card title="DP-SGD — per-step update">
          <p className="text-sm text-slate-700 leading-relaxed">
            For each mini-batch <em>B</em>, for each sample <em>i ∈ B</em>, compute the per-sample loss gradient, clip
            its L₂ norm to <em>C</em>, average across the batch, add isotropic Gaussian noise, and descend:
          </p>
          <pre className="math-block mt-3">
{`g̃ᵢ  =  ∇ℓ(θ; xᵢ) · min( 1,  C / ‖∇ℓ(θ; xᵢ)‖₂ )

ĝ   =  (1 / |B|) · (  Σᵢ g̃ᵢ  +  N( 0,  σ² · C² · I )  )

θ   ←  θ  −  η · ĝ`}
          </pre>
          <p className="text-sm text-slate-700 mt-3 leading-relaxed">
            σ is calibrated so that cumulative ε over training matches the target budget under the{' '}
            <strong>Rényi Differential Privacy (RDP)</strong> accountant (Mironov, 2017; Wang et al., 2019), which
            composes privacy loss across optimizer steps more tightly than classical composition.
          </p>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Why GroupNorm, not BatchNorm?">
            <p className="text-sm text-slate-700 leading-relaxed">
              Opacus requires <em>per-sample</em> gradients, but BatchNorm's batch statistics couple samples within a
              mini-batch, making per-sample gradients ill-defined. GroupNorm (8 groups) normalises within each sample
              independently, preserving the DP guarantee while retaining the stabilising benefits of feature-map
              normalisation.
            </p>
          </Card>
          <Card title="Why no augmentation during DP training?">
            <p className="text-sm text-slate-700 leading-relaxed">
              Heavy augmentation raises per-sample gradient variance. Since DP-SGD's additive noise scales with the
              clipping norm <em>C</em>, noisier gradients force either larger <em>C</em> (more injected noise) or more
              aggressive clipping (more bias). Disabling augmentation consistently improved DP-SGD accuracy in our
              experiments, aligning with findings in De et al. (2022).
            </p>
          </Card>
        </div>

        <Card title="RDP accountant — intuition">
          <p className="text-sm text-slate-700 leading-relaxed">
            RDP tracks privacy loss as a Rényi divergence of order <em>α</em>. The Gaussian mechanism at sampling
            rate <em>q</em>, noise multiplier <em>σ</em>, and order <em>α</em> incurs RDP at rate roughly{' '}
            <span className="font-mono">2 α q² / σ²</span> per step (Wang et al., 2019). After <em>T</em> steps we
            convert total RDP back to an (ε, δ) statement. This lets us calibrate σ to hit a chosen ε at fixed δ.
          </p>
        </Card>

        <Card title="References (IEEE placeholders — fill before submission)">
          <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside font-mono leading-relaxed">
            <li>M. Abadi et al., “Deep Learning with Differential Privacy,” in <em>Proc. ACM CCS</em>, 2016.</li>
            <li>I. Mironov, “Rényi Differential Privacy,” in <em>Proc. IEEE CSF</em>, 2017.</li>
            <li>Y.-X. Wang, B. Balle, S. Kasiviswanathan, “Subsampled Rényi Differential Privacy and Analytical Moments Accountant,” in <em>AISTATS</em>, 2019.</li>
            <li>A. Yousefpour et al., “Opacus: User-Friendly Differential Privacy Library in PyTorch,” arXiv:2109.12298, 2021.</li>
            <li>D. Yu et al., “Large Scale Private Learning via Low-Rank Reparametrization (RGP),” in <em>ICML</em>, 2021.</li>
            <li>D. Yu et al., “Do Not Let Privacy Overbill Utility: Gradient Embedding Perturbation (GEP),” in <em>ICLR</em>, 2021.</li>
            <li>J. Yang et al., “MedMNIST v2 — A Large-Scale Lightweight Benchmark for 2D and 3D Biomedical Image Classification,” <em>Scientific Data</em>, 2023.</li>
            <li>S. De et al., “Unlocking High-Accuracy Differentially Private Image Classification through Scale,” arXiv:2204.13650, 2022.</li>
            <li>Y. Wu and K. He, “Group Normalization,” in <em>Proc. ECCV</em>, 2018.</li>
            <li>C. Dwork and A. Roth, “The Algorithmic Foundations of Differential Privacy,” <em>Foundations and Trends in TCS</em>, 2014.</li>
          </ol>
        </Card>
      </div>
    </PageTransition>
  )
}