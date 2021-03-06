import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LoggerService } from '@srk/core';
import { ExceptionService } from '@srk/core';
import { UserDeviceService } from '@srk/core';
import { Subscription } from 'rxjs/Subscription';
import { NotifyService } from '@srk/core';
import { MessageService } from '@srk/core';
import { ApplicationDataService } from '@srk/core';
import { Router } from '@angular/router';
import { ApplicationAuditService, SessionStorageService } from '@srk/core';

declare var jQuery: any;
declare var io: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  public routerSubscription: Subscription;
  public blockPage = false;
  public blockMessage = '';
  private showBlockUISubscription: Subscription;
  private hideBlockUISubscription: Subscription;
  private showGrowlMessageSubscription: Subscription;
  public msgs: string[] = [];

  constructor(
    private translate: TranslateService,
    private logger: LoggerService,
    private router: Router,
    private exceptionService: ExceptionService,
    private notify: NotifyService,
    private userDeviceService: UserDeviceService,
    private messageService: MessageService,
    private applicationDataService: ApplicationDataService,
    private auditService: ApplicationAuditService,
    private sessionStorageService: SessionStorageService
  ) { }

  @HostListener('document:contextmenu', ['$event'])
  onDocumentRightClick(event) {
    (event || window.event).preventDefault();
  }

  ngOnInit() {
    this.sessionStorageService.clearSessionStorage();
    this.applicationDataService.initEnvironments().subscribe((response) => {
      if (response !== undefined && response !== null) {
        this.disableSocketLogs();
        this.exceptionService.subscribeErrorLogging();
        this.initApplicationLanguage();
        this.logger.initLoggingContext();
        this.applyApplicationTheme();
        this.applicationDataService.initializeAuditSetting().subscribe(res => { });
      }
    });

    this.showBlockUISubscription = this.notify.notifyShowBlockUIObservable$.subscribe(data => {
      this.blockPage = true;
      this.blockMessage = data.message;
    });

    this.hideBlockUISubscription = this.notify.notifyHideBlockUIObservable$.subscribe(data => {
      this.blockPage = false;
      this.blockMessage = '';
    });

    this.showGrowlMessageSubscription = this.notify.notifyShowGrowlMsgObservable$.subscribe(data => {
      setTimeout(() => {
        this.msgs = [];
      }, 5000);
      this.messageService.invokeGrowlMessage(data.severity, data.messageCode, this.msgs);
    });
    this.routerSubscription = this.router.events.subscribe((val: any) => {
      if (val.urlAfterRedirects === window.location.pathname) {
        this.auditService.getActivityAuditData(val.urlAfterRedirects);
      }
    });
  }

  disableSocketLogs() {
    //  io.sails.environment = 'production'; // Removing this will result console.log of socket logs.
  }

  applyApplicationTheme() {
    // TODO :- Below lines will be used in white labelling. Org specific color-theme css will be placed
    // in assets styles folder and will be picked according to Org name.
    const layoutLink: HTMLLinkElement[] = <(HTMLLinkElement[])>jQuery('link[href*="color-theme"]');
    for (let index = 0; index < layoutLink.length; index++) {
      const colorThemeLink = layoutLink[index];
      if (colorThemeLink.href.indexOf(this.applicationDataService.getOrgName()) === -1) {
        colorThemeLink.href = '';
      }
    }
  }

  initApplicationLanguage() {
    this.translate.addLangs(['en', 'es', 'zh']);
    this.translate.setDefaultLang('en');
    let lang = '';
    if (this.userDeviceService.isDeviceSupportLocalStorage()) {
      lang = window.localStorage.getItem('lang');
    }
    if (lang !== undefined && lang !== '' && lang !== null) {
      this.translate.use(lang);
    } else {
      this.translate.use('en');
      if (this.userDeviceService.isDeviceSupportLocalStorage()) {
        window.localStorage.setItem('lang', 'en');
      }
    }
    // let browserLang = this.translate.getBrowserLang();
    // translate.use(browserLang.match(/en|es|zh/) ? browserLang : 'en');
  }

  ngOnDestroy() {
    this.exceptionService.unsubscribeErrorLogging();
    this.showBlockUISubscription.unsubscribe();
    this.hideBlockUISubscription.unsubscribe();
    this.showGrowlMessageSubscription.unsubscribe();
    this.routerSubscription.unsubscribe();
  }

}
