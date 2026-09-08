plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "2.1.10"
    id("org.jetbrains.intellij.platform") version "2.5.0"
}

group = providers.gradleProperty("pluginGroup").get()
version = providers.gradleProperty("pluginVersion").get()

kotlin {
    jvmToolchain(21)
}

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

val bundledIdea = providers.gradleProperty("localIdePath").orNull?.let { file(it) }?.takeIf { it.isDirectory }

dependencies {
    intellijPlatform {
        if (bundledIdea != null) {
            local(bundledIdea)
        } else {
            intellijIdeaCommunity(providers.gradleProperty("platformVersion"))
        }
    }
}

val vscodeRoot = rootProject.projectDir.resolve("../vscode")
val generatedGrok = layout.buildDirectory.dir("generated-grok")

val copySharedAssets by tasks.registering(Copy::class) {
    description = "Copy shared WebView + Node sidecar from vscode/dist"
    from(vscodeRoot.resolve("dist/webview.js"))
    from(vscodeRoot.resolve("dist/diff.js"))
    from(vscodeRoot.resolve("dist/host.js"))
    from(vscodeRoot.resolve("dist")) {
        include("shiki-monaco.js")
    }
    from(vscodeRoot.resolve("media/chat.css"))
    from(vscodeRoot.resolve("media/diff.css"))
    from(vscodeRoot.resolve("media/icon.svg"))
    from(vscodeRoot.resolve("media/grok-symbol.png"))
    val monaco = vscodeRoot.resolve("dist/monaco")
    if (monaco.resolve("vs/loader.js").isFile) {
        from(monaco) {
            into("monaco")
        }
    }
    into(generatedGrok.map { it.dir("grok") })
    doFirst {
        val host = vscodeRoot.resolve("dist/host.js")
        val webview = vscodeRoot.resolve("dist/webview.js")
        if (!host.isFile || !webview.isFile) {
            throw GradleException(
                "Shared bundles missing. Run `npm run compile` in vscode/ first. Expected $host",
            )
        }
    }
}

sourceSets {
    main {
        resources {
            srcDir(generatedGrok)
        }
    }
}

tasks.named("processResources") {
    dependsOn(copySharedAssets)
}

intellijPlatform {
    pluginConfiguration {
        id = "cn.mckafei.grok-build"
        name = providers.gradleProperty("pluginName")
        version = providers.gradleProperty("pluginVersion")
        ideaVersion {
            sinceBuild = providers.gradleProperty("pluginSinceBuild")
            untilBuild = providers.gradleProperty("pluginUntilBuild")
        }
    }
}

tasks {
    wrapper {
        gradleVersion = "8.13"
    }
}
