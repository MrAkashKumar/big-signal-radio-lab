# README visuals

The root README embeds local images so GitHub can display them without a third-party image host.

| Asset | Purpose | Source |
| --- | --- | --- |
| `bigsignal-banner.svg` | Project name, Radio Science Lab subtitle, and learning promise | Repository-authored vector illustration; conceptual path, not simulation evidence |
| `website-home.jpg` | Actual website introduction and navigation | Local browser capture, 19 September 2026 |
| `website-rescue-story.jpg` | Actual rescue-story interface | Local browser capture, 19 September 2026; the app labels the terrain and routes illustrative |

## Add or replace a website screenshot

1. Run `bun run dev` from the repository root and open the printed URL.
2. Navigate to the view you want to explain. Close personal dialogs and avoid capturing credentials, conversations, student details, or private experiment names.
3. Capture the browser content. Use a clear viewport image; avoid an excessively long full-page capture. Keep text legible and do not edit a screenshot to imply a feature works differently.
4. Save the PNG or JPEG in `docs/images/` with a matching extension and descriptive lowercase filename, such as `website-radio-lab.png`.
5. Add the image below the README introduction or in **Website preview**, using the root-relative-to-document path shown below.
6. Add a factual caption, capture date, and meaningful alternative text. Label mockups and conceptual art explicitly. Preview the Markdown and check that the file is tracked when a maintainer later commits.

```md
![Radio lab showing a terrain experiment and its controls](docs/images/website-radio-lab.png)
```

That filename is an example, not a bundled screenshot. Use an existing file or add your capture before embedding it. Inside a document in `docs/`, use `images/filename.png` instead. Do not use an absolute path from your own computer in repository Markdown.

Screenshots document appearance, not accessibility conformance, scientific accuracy, or provider availability. Refresh them when navigation or layout changes materially.
