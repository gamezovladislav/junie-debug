# Junie CLI (@jetbrains/junie-cli) diagnosis and fixes

## Diagnosis (where the chain breaks)
1. `npm install` runs `postinstall.js`.
2. `postinstall.js` downloads the release from GitHub and extracts into `bin/junie/` inside the package (via `unzipper`).
3. After extraction it writes the marker file `bin/junie.download`.
4. The CLI entrypoint (`bin/index.js`) calls `getExecutable()` from `getExecutable.js`.
5. If the binary is missing, `getExecutable()` prints a message and returns `undefined`, then `spawnSync(undefined, ...)` throws `The "file" argument must be of type string. Received undefined`.

Critical points in the current implementation:
- `postinstall.js` does not verify the binary exists after extraction. It writes the marker even if the binary is missing or ends up in a different path.
- `getExecutable()` does not throw; it returns `undefined`, which causes the secondary `Received undefined` error.
- `unzipper@0.12.3` does not extract the full Junie zip on Linux x64, so `junie/bin/junie` is missing even though it exists in the archive.
- The binary is only downloaded from GitHub; behind proxy/firewalls, `fetch()` does not use `npm config proxy` and can silently fail or error.

## Verified paths and expected files
- `package.json` -> `bin: {"junie": "bin/index.js"}`, `postinstall: node postinstall.js`.
- Linux x64 zip (`junie-eap-576.1-linux-amd64.zip`) contains `junie/bin/junie`.
- Expected path on Linux after extraction: `bin/junie/junie/bin/junie`.

## Minimal reproduction
### Variant A: binary missing but marker present (current error)
1. Install with lifecycle scripts:
```bash
npm i -g @jetbrains/junie-cli --foreground-scripts --verbose
```
2. Remove the binary (simulate broken extraction):
```bash
rm -f "$(npm root -g)/@jetbrains/junie-cli/bin/junie/junie/bin/junie"
```
3. Run:
```bash
junie --help
```
4. Result: `Junie binary not found...` + `Received undefined`.

### Variant B: postinstall not running
1. Disable lifecycle:
```bash
npm config set ignore-scripts true
npm i -g @jetbrains/junie-cli
```
2. Run:
```bash
junie --help
```
3. The binary was never downloaded; you get a corrupted install error.

## Observed behavior (Linux x64)
- `unzipper` extracts ~150–165 files instead of 374 and skips `junie/bin/junie`.
- System `unzip` extracts the archive fully; the binary is present.

## Repro for the `unzipper` bug
1. Download the archive:
```bash
node -e "fetch('https://github.com/jetbrains-junie/junie/releases/download/576.1/junie-eap-576.1-linux-amd64.zip').then(r=>r.arrayBuffer()).then(b=>require('fs').writeFileSync('junie.zip', Buffer.from(b)))"
```
2. Extract with `unzipper`:
```bash
node -e "require('fs').createReadStream('junie.zip').pipe(require('unzipper').Extract({path:'out'})).promise().then(()=>console.log(require('fs').existsSync('out/junie/bin/junie')))"
```
<details>

<summary>Result (unzipper)</summary>
Run <pre>tree</pre> in terminal
<pre>
.
└── junie
    └── lib
        ├── app
        │   ├── junie-eap-576.1.jar
        │   └── junie.cfg
        ├── junie.png
        ├── libapplauncher.so
        └── runtime
            ├── legal
            │   ├── java.instrument
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.logging
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.management
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.prefs
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.rmi
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.scripting
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.smartcardio
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   └── pcsclite.md
            │   ├── java.sql
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.transaction.xa
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.charsets
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.compiler
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.editpad
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.httpserver
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.incubator.vector
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.internal.le
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   └── jline.md
            │   ├── jdk.internal.opt
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   └── jopt-simple.md
            │   ├── jdk.jartool
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.javadoc
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   ├── jquery.md
            │   │   └── jqueryUI.md
            │   ├── jdk.jconsole
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.jdi
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.jsobject
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.random
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.sctp
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   └── jdk.security.jgss
            │       └── ASSEMBLY_EXCEPTION
            └── lib
                ├── classlist
                ├── ct.sym
                ├── jexec
                ├── jfr
                │   ├── default.jfc
                │   └── profile.jfc
                ├── jrt-fs.jar
                ├── jspawnhelper
                ├── jvm.cfg
                ├── libattach.so
                ├── libawt.so
                ├── libawt_headless.so
                ├── libawt_xawt.so
                ├── libdt_socket.so
                ├── libextnet.so
                ├── libfontmanager.so
                ├── libinstrument.so
                ├── libj2gss.so
                ├── libj2pcsc.so
                ├── libj2pkcs11.so
                ├── libjaas.so
                ├── libjava.so
                ├── libjavajpeg.so
                ├── libjawt.so
                ├── libjdwp.so
                ├── libjimage.so
                ├── libjli.so
                ├── libjsig.so
                ├── libjsound.so
                ├── libjsvml.so
                ├── liblcms.so
                ├── lible.so
                ├── libmanagement.so
                ├── libmanagement_agent.so
                ├── libmanagement_ext.so
                ├── libmlib_image.so
                ├── libnet.so
                ├── libnio.so
                ├── libprefs.so
                ├── librmi.so
                ├── libsctp.so
                ├── libsplashscreen.so
                ├── libsyslookup.so
                ├── libverify.so
                ├── libzip.so
                ├── modules
                ├── psfont.properties.ja
                ├── psfontj2d.properties
                ├── security
                │   ├── blocked.certs
                │   ├── cacerts
                │   ├── default.policy
                │   └── public_suffix_list.dat
                ├── server
                │   ├── libjsig.so
                │   └── libjvm.so
                └── tzdb.dat

34 directories, 133 files
</pre>
</details>

3. Extract with system `unzip`:
```bash
unzip -q junie.zip -d out2 && test -x out2/junie/bin/junie
```

<details>

<summary>Result (unzip)</summary>
Run <pre>tree</pre> in terminal
<pre>
.
└── junie
    ├── bin
    │   └── junie
    └── lib
        ├── app
        │   ├── junie-eap-576.1.jar
        │   └── junie.cfg
        ├── junie.png
        ├── libapplauncher.so
        └── runtime
            ├── conf
            │   ├── jaxp.properties
            │   ├── logging.properties
            │   ├── management
            │   │   ├── jmxremote.access
            │   │   ├── jmxremote.password.template
            │   │   └── management.properties
            │   ├── net.properties
            │   ├── sdp
            │   │   └── sdp.conf.template
            │   ├── security
            │   │   ├── java.policy
            │   │   ├── java.security
            │   │   └── policy
            │   │       ├── README.txt
            │   │       ├── limited
            │   │       │   ├── default_US_export.policy
            │   │       │   ├── default_local.policy
            │   │       │   └── exempt_local.policy
            │   │       └── unlimited
            │   │           ├── default_US_export.policy
            │   │           └── default_local.policy
            │   └── sound.properties
            ├── legal
            │   ├── java.base
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   ├── aes.md
            │   │   ├── asm.md
            │   │   ├── c-libutl.md
            │   │   ├── cldr.md
            │   │   ├── icu.md
            │   │   ├── public_suffix.md
            │   │   ├── siphash.md
            │   │   └── unicode.md
            │   ├── java.compiler
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.datatransfer
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.desktop
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   ├── colorimaging.md
            │   │   ├── mesa3d.md
            │   │   ├── pipewire.md
            │   │   └── xwd.md
            │   ├── java.instrument
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.logging
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.management
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.management.rmi
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.naming
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.net.http
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.prefs
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.rmi
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.scripting
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.security.jgss
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.security.sasl
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.smartcardio
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   └── pcsclite.md
            │   ├── java.sql
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.sql.rowset
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.transaction.xa
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── java.xml
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   ├── bcel.md
            │   │   ├── dom.md
            │   │   ├── jcup.md
            │   │   ├── xalan.md
            │   │   └── xerces.md
            │   ├── java.xml.crypto
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   └── santuario.md
            │   ├── jdk.accessibility
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.attach
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.charsets
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.compiler
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.crypto.cryptoki
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   ├── pkcs11cryptotoken.md
            │   │   └── pkcs11wrapper.md
            │   ├── jdk.crypto.ec
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.dynalink
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   └── dynalink.md
            │   ├── jdk.editpad
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.httpserver
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.incubator.vector
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.internal.ed
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.internal.jvmstat
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.internal.le
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   └── jline.md
            │   ├── jdk.internal.opt
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   └── jopt-simple.md
            │   ├── jdk.jartool
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.javadoc
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   ├── jquery.md
            │   │   └── jqueryUI.md
            │   ├── jdk.jconsole
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.jdeps
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.jdi
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.jdwp.agent
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.jfr
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.jlink
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.jpackage
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.jshell
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.jsobject
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.jstatd
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.localedata
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   ├── LICENSE
            │   │   ├── cldr.md
            │   │   └── thaidict.md
            │   ├── jdk.management
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.management.agent
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.management.jfr
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.naming.dns
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.naming.rmi
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.net
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.nio.mapmode
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.random
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.sctp
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.security.auth
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.security.jgss
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.unsupported
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.unsupported.desktop
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   ├── jdk.xml.dom
            │   │   ├── ADDITIONAL_LICENSE_INFO
            │   │   ├── ASSEMBLY_EXCEPTION
            │   │   └── LICENSE
            │   └── jdk.zipfs
            │       ├── ADDITIONAL_LICENSE_INFO
            │       ├── ASSEMBLY_EXCEPTION
            │       └── LICENSE
            ├── lib
            │   ├── classlist
            │   ├── ct.sym
            │   ├── jexec
            │   ├── jfr
            │   │   ├── default.jfc
            │   │   └── profile.jfc
            │   ├── jrt-fs.jar
            │   ├── jspawnhelper
            │   ├── jvm.cfg
            │   ├── libattach.so
            │   ├── libawt.so
            │   ├── libawt_headless.so
            │   ├── libawt_xawt.so
            │   ├── libdt_socket.so
            │   ├── libextnet.so
            │   ├── libfontmanager.so
            │   ├── libinstrument.so
            │   ├── libj2gss.so
            │   ├── libj2pcsc.so
            │   ├── libj2pkcs11.so
            │   ├── libjaas.so
            │   ├── libjava.so
            │   ├── libjavajpeg.so
            │   ├── libjawt.so
            │   ├── libjdwp.so
            │   ├── libjimage.so
            │   ├── libjli.so
            │   ├── libjsig.so
            │   ├── libjsound.so
            │   ├── libjsvml.so
            │   ├── liblcms.so
            │   ├── lible.so
            │   ├── libmanagement.so
            │   ├── libmanagement_agent.so
            │   ├── libmanagement_ext.so
            │   ├── libmlib_image.so
            │   ├── libnet.so
            │   ├── libnio.so
            │   ├── libprefs.so
            │   ├── librmi.so
            │   ├── libsctp.so
            │   ├── libsplashscreen.so
            │   ├── libsyslookup.so
            │   ├── libverify.so
            │   ├── libzip.so
            │   ├── modules
            │   ├── psfont.properties.ja
            │   ├── psfontj2d.properties
            │   ├── security
            │   │   ├── blocked.certs
            │   │   ├── cacerts
            │   │   ├── default.policy
            │   │   └── public_suffix_list.dat
            │   ├── server
            │   │   ├── libjsig.so
            │   │   └── libjvm.so
            │   └── tzdb.dat
            └── release

81 directories, 293 files
</pre>
</details>

## Root cause
1. `unzipper@0.12.3` fails to extract the tail part of the Junie archive, so the binary is missing.
2. `getExecutable()` returns `undefined` instead of throwing, which leads to `spawnSync(undefined, ...)`.
3. `postinstall.js` does not validate the binary after extraction and still writes the marker.
4. No readable fallback/override (for example, an env var for a binary path).

## Proposed fix (patch)
See `junie-debug/junie-cli-fix.patch`.

Key changes:
- `getExecutable()`:
    - reads the marker file contents,
    - supports `JUNIE_BINARY_PATH` / `JUNIE_BINARY`,
    - throws with a clear diagnostic if the binary is missing.
- `bin/index.js`: handles `result.error` from `spawnSync`.
- `postinstall.js`:
    - prefers system `unzip` (fallback to `unzipper`) to avoid partial extraction,
    - validates the binary exists,
    - supports `JUNIE_DOWNLOAD_URL` (override URL),
    - adds `JUNIE_FORCE_UNZIPPER=1` to force JS extraction for debugging.

## User instructions (without patch)
1. Ensure scripts are not disabled:
    ```bash
    npm config get ignore-scripts
    npm config set ignore-scripts false
    ```
2. Rebuild the package:
    ```bash
    npm rebuild @jetbrains/junie-cli --foreground-scripts --verbose
    ```
3. Check Node version:
    ```bash
    node -v
    ```
4. Check access to GitHub (or proxy/SSL interception).

## Workaround for network/proxy issues
- Download the zip manually (or through your proxy/mirror).
- Extract with **system** `unzip` into:
    - local: `node_modules/@jetbrains/junie-cli/bin/junie/`
    - global: `$(npm root -g)/@jetbrains/junie-cli/bin/junie/`
- Ensure the binary exists at:
    - Linux: `bin/junie/junie/bin/junie`
- Create the marker file:
  ```bash
  echo "$(npm root -g)/@jetbrains/junie-cli/bin/junie/junie/bin/junie" > "$(npm root -g)/@jetbrains/junie-cli/bin/junie.download"
  ```
- Run:
  ```bash
  junie --help
  ```

## Verify the fix
1. Install/rebuild:
   ```bash
   npm rebuild @jetbrains/junie-cli --foreground-scripts --verbose
   ```
2. Check the expected path:
   ```bash
   node -p "require('@jetbrains/junie-cli/getExecutable').getExpectedBinaryPath()"
   ```
3. Run:
    ```bash
    junie --help
    ```
4. Debug extraction if needed:
   ```bash
   JUNIE_FORCE_UNZIPPER=1 npm rebuild @jetbrains/junie-cli --foreground-scripts --verbose
   ```

### Verified in this environment
- Linux x64, Node v24.11.0 / npm 11.6.1
- `postinstall.js` completed successfully with system `unzip`
- `junie --help` worked correctly

## Additional diagnostics
- `node -p "process.platform + ' ' + process.arch"`
- `npm config get proxy` / `npm config get https-proxy`
- If GitHub is unavailable, use mirrors/`JUNIE_DOWNLOAD_URL` (after patch)
