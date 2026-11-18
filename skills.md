# スキルの選定と共有

## 選定方針

- プロジェクトの要件と既存スキルを確認し、下記の共通候補から必要なものを選ぶ。同じ用途では採用済みの候補を優先し、別候補を選ぶ場合は理由を記録する。
- 環境に導入済みのスキルで十分なら重複して導入しない。ただし、その環境にあるだけで他の環境でも利用できるとは扱わず、プロジェクトで必要なスキルは採用記録に残す。
- 推奨候補は調査の出発点として扱い、常に最適とはみなさない。新規導入・更新前には、現在の配布・保守状況、対応環境、互換性を調べ、要件への適合性を判断する。
- 外部スキルは提供元の公式配布を優先し、導入・更新前に指示、スクリプト、参照ファイル、ライセンス、実行依存を確認する。必要のない権限・外部送信・公開操作を要求するものは採用しない。
- 要件に合う候補がなければ調査して追加する。推奨候補の追加だけを理由に既存プロジェクトのスキルを入れ替えない。

## 共通の推奨候補

以下は選定の起点であり、必須の導入セットではない。名称は候補の識別用で、導入時に配布元と対象パスを確認する。同名でも配布元が異なるものを同一視しない。

| 用途・適用条件 | 優先して確認する候補 |
| --- | --- |
| 未導入スキルの探索が必要 | [`find-skills`](https://github.com/vercel-labs/skills/tree/main/skills/find-skills)（vercel-labs/skills） |
| Vue 3・Composition API・コンポーネント設計 | [`vue-best-practices`](https://github.com/vuejs-ai/skills/tree/main/skills/vue-best-practices)（vuejs-ai/skills） |
| Vueのテスト設計・実装（Vitest・Vue Test Utils・Playwright） | [`vue-testing-best-practices`](https://github.com/vuejs-ai/skills/tree/main/skills/vue-testing-best-practices)（vuejs-ai/skills） |
| 新しい画面の制作・配色・文字・レイアウトの改善 | [`frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design)（anthropics/skills） |
| UI・アクセシビリティ・操作性のコードレビュー | [`web-design-guidelines`](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines)（vercel-labs/agent-skills） |
| AWSへのアプリ公開・移行 | [`launch-with-aws`](https://github.com/aws/agent-toolkit-for-aws/tree/main/skills/core-skills/launch-with-aws)（AWS） |
| AWS CDKによる構成管理 | [`aws-cdk`](https://github.com/aws/agent-toolkit-for-aws/tree/main/skills/core-skills/aws-cdk)（AWS） |
| AWSサーバーレス構成の選定・実装 | [`aws-serverless`](https://github.com/aws/agent-toolkit-for-aws/tree/main/skills/core-skills/aws-serverless)（AWS） |
| その他のAWS関連作業 | [`agent-toolkit-for-aws`](https://github.com/aws/agent-toolkit-for-aws)（AWS）。スキル集から利用サービス・言語・作業に合うものを選ぶ |
| SVG素材の制作 | [`svg-creator`](https://github.com/upbrew-tech/svg-creator-skill)（upbrew-tech/svg-creator-skill） |
| Three.jsによる3D表現 | [`threejs-skills`](https://github.com/CloudAI-X/threejs-skills)（CloudAI-X）。スキル集から用途に必要なものを選び、対象とするThree.jsの版との互換性を確認する |

`frontend-design` は画面を作る際のデザイン、`web-design-guidelines` はUIコードのレビューを補う。いずれも既存のデザイン方針と [ui-guidelines.md](ui-guidelines.md) を優先する。ブラウザ検証の候補は、採用構成と必要な検証に合わせて選ぶ。未評価のものを名称だけで共通推奨に追加しない。

## リポジトリでの管理

- 自作・プロジェクト専用スキルは `.agents/skills/<name>/` に置き、必要なスクリプト・参照資料とともにGitで管理する。
- 外部スキルは、小規模で再配布条件を満たせるものは実体を同梱してよい。必要なLICENSE・NOTICE・著作権表示を維持し、同梱素材やコードの個別条件も確認する。公開されているだけで再配布可能とは判断しない。
- 大きな外部スキルや配布側の仕組みで管理するものは、取得元と採用した版の記録から復元する。`.agents/skills/` 全体を除外せず、復元対象の配置先だけを `.gitignore` に記載する。
- 外部スキルを採用した時点で `tools/skills-sources.json` を作り、名前、用途、取得元URL、取得元の対象パス、完全なコミットSHAまたは不変な配布版・検証用ハッシュ、配置先、管理方法（同梱・復元・環境提供）、ライセンスと表示文書の場所、ローカル修正の有無を記録する。独自の記録ファイルであり、Codexが自動で復元するものではない。
- 利用するインストーラーにロック機能がある場合は、固定される対象を確認してそのファイルも管理する。取得元情報は重複記載せず、採用記録から参照する。
- 復元方式を採用する場合は、採用記録にある版を取得するセットアップ手段もリポジトリで管理し、READMEに実行方法を書く。未登録の既存ファイルを無断で上書きしない。個人ディレクトリへの絶対パスや、その環境だけにあるシンボリックリンクに依存しない。
- 依存パッケージ、キャッシュ、生成物、認証情報は同梱しない。CLI・ランタイム・MCP接続などの前提条件は記録し、認証情報は各環境で設定する。スキルの配置だけで外部サービスへの接続が復元されるとは扱わない。
- 作業に関連するスキルは、変更内容・互換性・ローカル修正への影響を確認し、問題が見込まれなければ適宜最新化してよい。通常の更新に個別の承認は求めず、採用記録・実体または復元情報を同時に更新する。更新後も他の環境で同じ内容を復元できるよう、実際に採用した版を記録する。改修する場合はパッチを管理するか、自作版として区別する。
- 導入後は、必要な参照先と実行依存が揃うことを確認する。別環境での復元確認を行ったか、未確認かも報告する。

## このプロジェクトの採用状況

現在はアプリの要件・構成が未決定のため、プロジェクト固有のスキルは未導入。採用が必要になった時点で記録・セットアップ手段を追加する。
