#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface EmberboundAppDelegate : NSObject <NSApplicationDelegate, WKNavigationDelegate>
@property(strong) NSWindow *window;
@property(strong) WKWebView *gameView;
@end

@implementation EmberboundAppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
    configuration.websiteDataStore = [WKWebsiteDataStore defaultDataStore];
    configuration.defaultWebpagePreferences.allowsContentJavaScript = YES;

    self.gameView = [[WKWebView alloc] initWithFrame:NSZeroRect configuration:configuration];
    self.gameView.navigationDelegate = self;
    self.gameView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    [self.gameView setValue:@NO forKey:@"drawsBackground"];

    NSWindowStyleMask style = NSWindowStyleMaskTitled |
                              NSWindowStyleMaskClosable |
                              NSWindowStyleMaskMiniaturizable |
                              NSWindowStyleMaskResizable |
                              NSWindowStyleMaskFullSizeContentView;
    self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 1280, 720)
                                              styleMask:style
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    self.window.title = @"EMBERBOUND — Erbe der ersten Flamme";
    self.window.titleVisibility = NSWindowTitleHidden;
    self.window.titlebarAppearsTransparent = YES;
    self.window.backgroundColor = [NSColor colorWithRed:0.09 green:0.07 blue:0.06 alpha:1.0];
    self.window.minSize = NSMakeSize(800, 450);
    self.window.contentView = self.gameView;
    [self.window setFrameAutosaveName:@"EmberboundFirstFlameWindow"];
    [self.window center];
    [self.window makeKeyAndOrderFront:nil];

    NSURL *gameURL = [[NSBundle mainBundle] URLForResource:@"index"
                                            withExtension:@"html"
                                             subdirectory:@"Game"];
    if (gameURL == nil) {
        NSAlert *alert = [[NSAlert alloc] init];
        alert.messageText = @"EMBERBOUND konnte nicht geladen werden.";
        alert.informativeText = @"Die Spieldaten fehlen im App-Paket.";
        [alert runModal];
        [NSApp terminate:nil];
        return;
    }

    [self.gameView loadFileURL:gameURL
        allowingReadAccessToURL:[gameURL URLByDeletingLastPathComponent]];
    [NSApp activateIgnoringOtherApps:YES];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        NSApplication *application = [NSApplication sharedApplication];
        EmberboundAppDelegate *delegate = [[EmberboundAppDelegate alloc] init];
        application.delegate = delegate;
        [application setActivationPolicy:NSApplicationActivationPolicyRegular];
        [application run];
    }
    return 0;
}

