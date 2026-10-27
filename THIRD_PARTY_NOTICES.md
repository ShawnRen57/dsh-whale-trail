# ASCII aquarium references and third-party notices

Whale Trail's 36 chapter rewards are original, hand-authored, printable ASCII drawings. Its deterministic time-based scene generator and transparent Canvas renderer are independently implemented. No third-party source files, silhouettes, fonts, assets, engines or runtime packages are bundled for the aquarium. System monospace fonts are used locally. The following projects were read as design and implementation research on 2026-10-27.

- [Chael-Chael/dsh-ascii-whales](https://github.com/Chael-Chael/dsh-ascii-whales): reference for whales across blank conversation space, transparent rendering, configurable color and lifecycle cleanup. Its original integration is MIT, copyright (c) 2026 Chael-Chael. Its separate notices explicitly distinguish the older vendored ascii-sharks snapshot, which did not contain a standalone license at that pinned revision. Whale Trail does not redistribute that snapshot or its fonts.
- [stackedlol/ascii-sharks](https://github.com/stackedlol/ascii-sharks): reference for ocean scale layers, schooling, fixed character cells, slow travel and reduced-motion behavior. The current main LICENSE reviewed below is MIT, copyright (c) 2026 drewdi. Whale Trail uses independent shared-phase formations and analytic positions rather than copying its boids, pursuit, spine, wake or rasterization implementation.
- [michikusa404/ascii-kanji-sharks](https://github.com/michikusa404/ascii-kanji-sharks): reference for a quiet sea, coherent schools, reproducible animation and species-specific text silhouettes. MIT, copyright (c) 2026 michikusa404. No Japanese glyph atlas, Google font, predator/eating effects or source code is included.

These are inspiration and research credits, not claims that the upstream authors created or endorsed Whale Trail. MIT notices are retained below as a conservative attribution record. They apply to the named upstream works; this file does not change Whale Trail's package license.

## Source review record

The linked main-branch sources were fetched directly and read. SHA-256 records the exact bytes reviewed, since main can change. No repository contents were imported into the distributable.

| Repository | File reviewed | SHA-256 |
| --- | --- | --- |
| Chael-Chael/dsh-ascii-whales | [README.md](https://github.com/Chael-Chael/dsh-ascii-whales/blob/main/README.md) | `ad829538018197694851ec7ac02522f3087156801d30cff387c6b1e6ffafbad1` |
| Chael-Chael/dsh-ascii-whales | [LICENSE](https://github.com/Chael-Chael/dsh-ascii-whales/blob/main/LICENSE) | `263b8e49b72b13498de915f56c6ceedcf970c3bc2d90b52a5b266062df54d816` |
| Chael-Chael/dsh-ascii-whales | [THIRD_PARTY_NOTICES.md](https://github.com/Chael-Chael/dsh-ascii-whales/blob/main/THIRD_PARTY_NOTICES.md) | `e730d5e207ea372915e6345ddfc9018691cc49991fa06979bdb4ab145e0acf15` |
| Chael-Chael/dsh-ascii-whales | [src/background.mjs](https://github.com/Chael-Chael/dsh-ascii-whales/blob/main/src/background.mjs) | `25c554ca42f4e878e04416c04a5aebbaefe4fabee4b639c8dfbde21b021bbfa3` |
| stackedlol/ascii-sharks | [README.md](https://github.com/stackedlol/ascii-sharks/blob/main/README.md) | `d908ac17def3148c66ae503dd6fd105155df5ec91a3cd984eb83f448dbf269e8` |
| stackedlol/ascii-sharks | [LICENSE](https://github.com/stackedlol/ascii-sharks/blob/main/LICENSE) | `c5caff4e891468c982ad58d5491fd30631ab9543188407390fa4bfdb711b4718` |
| stackedlol/ascii-sharks | [src/engine.ts](https://github.com/stackedlol/ascii-sharks/blob/main/src/engine.ts) | `4ca00f71ec8bbac4d4f59752b8808eb7a1785b1977a354eb34c82f6ffaa8c717` |
| stackedlol/ascii-sharks | [src/world.ts](https://github.com/stackedlol/ascii-sharks/blob/main/src/world.ts) | `f2f8f8daf85698fffc7925c8309c1b3a10f5882957b5674fe1858d2ecf534457` |
| stackedlol/ascii-sharks | [src/renderer.ts](https://github.com/stackedlol/ascii-sharks/blob/main/src/renderer.ts) | `1175efcd707292125129bbb1aefcf75768367b75672abf282313746ebabd1f71` |
| michikusa404/ascii-kanji-sharks | [README.md](https://github.com/michikusa404/ascii-kanji-sharks/blob/main/README.md) | `fd756a8483a1ac295ce75276347c4b1ef0eab900413016832a7d226c610ee348` |
| michikusa404/ascii-kanji-sharks | [LICENSE](https://github.com/michikusa404/ascii-kanji-sharks/blob/main/LICENSE) | `e7f07375095ba16213904be3a5ea9d17540198541834a5e599febe740a1d4dbf` |
| michikusa404/ascii-kanji-sharks | [js/main.js](https://github.com/michikusa404/ascii-kanji-sharks/blob/main/js/main.js) | `9f6f98773e89a16213462fffc2caa0ad3b62e007422c7aa9761e63d604497ef2` |
| michikusa404/ascii-kanji-sharks | [js/ocean.js](https://github.com/michikusa404/ascii-kanji-sharks/blob/main/js/ocean.js) | `fdb8668b5c5b4b4e9d827ecdcfd39443846f1cdc9cb5dca7a005965943f541d8` |
| michikusa404/ascii-kanji-sharks | [js/painter.js](https://github.com/michikusa404/ascii-kanji-sharks/blob/main/js/painter.js) | `0c7308bee7b497ee95af37fb654fa584c87b2dd2ed1fc1b52e52cf5df58ac648` |

## Upstream MIT license notices

### Chael-Chael/dsh-ascii-whales

```text
The MIT license below applies to original DeepSeek Harness integration,
configuration, build/test scripts and documentation in this project.
Vendored ascii-sharks source retains upstream authorship and terms;
see THIRD_PARTY_NOTICES.md. This license does not relicense that source.

MIT License

Copyright (c) 2026 Chael-Chael

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### stackedlol/ascii-sharks

```text
MIT License

Copyright (c) 2026 drewdi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### michikusa404/ascii-kanji-sharks

```text
MIT License

Copyright (c) 2026 michikusa404

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
