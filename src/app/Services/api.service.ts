import {Injectable} from '@angular/core';
import {tap, catchError} from 'rxjs/operators';
import {HttpClient, HttpHeaders, HttpErrorResponse} from '@angular/common/http';
import { EventEmitter } from '@angular/core';
import { Story } from '../model/Story';
import { Observable, throwError, of } from 'rxjs';
import { StepType } from '../model/StepType';
import { Scenario } from '../model/Scenario';
import { Background } from '../model/Background';
import {CookieService} from 'ngx-cookie-service'

@Injectable({
    providedIn: 'root'
})

export class ApiService {
    public apiServer: string = localStorage.getItem('url_backend');
    public token: string;
    public urlReceived: boolean = false;
    public storiesErrorEvent = new EventEmitter();
    public getStoriesEvent = new EventEmitter();
    public getTokenEvent = new EventEmitter();
    public getBackendUrlEvent = new EventEmitter();
    public getRepositoriesEvent = new EventEmitter();

    public user;
    constructor(private http: HttpClient, private cookieService: CookieService) {
    }


    public getOptions(){
        return { withCredentials: true}
    }

    public getRepositories(): Observable<string[]> {
        this.apiServer = localStorage.getItem('url_backend');
      
        const str = this.apiServer + '/github/repositories'; 
        
        return this.http.get<string[]>(str, this.getOptions())
          .pipe(tap(resp => {
            this.getRepositoriesEvent.emit(resp);
          }),
            catchError(this.handleError));
    }    

    public githubLogin() {
        const str = this.apiServer + '/user/githubLogin'

        const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'; 
        const CLIENT_ID = 'cbd4f16f4d38bce28a25'
        const REDIRECT_URI = 'http://localhost:4200/callback'
        const ENCODED_REDIRECT_URI = encodeURIComponent(REDIRECT_URI);
        let s = `${AUTHORIZE_URL}?scope=repo&client_id=${CLIENT_ID}&redirect_uri=${ENCODED_REDIRECT_URI}`;
        console.log(s)
        window.location.href = s;

        //return this.http.get<string[]>(str)
        //  .pipe(tap(resp => {
        //      console.log('resp: ' + JSON.stringify(resp))
        //    //this.getStoriesEvent.emit(resp);
        //  }),
        //    catchError(this.handleError));
    }

    public loginGihubToken(login: string, id){
        const str = this.apiServer + '/user/githubLogin'
        let user = {login, id}

        return this.http.post<string[]>(str, user, this.getOptions())
          .pipe(tap(resp => {
            //this.getStoriesEvent.emit(resp);
          }),
            catchError(this.handleError));
    }

    public loginUser(email: string, password: string): Observable<any> {
        const str = this.apiServer + '/user/login'
        let user;
        if(!email && !password){

        }else {
            user = {
                email, password
            }
        }

        return this.http.post<string[]>(str, user, this.getOptions())
          .pipe(tap(resp => {
            //this.getStoriesEvent.emit(resp);
          }),
            catchError(this.handleError));
    }

    logoutUser(){
        let str = this.apiServer + '/user/logout'
       return  this.http.get<string[]>(str, this.getOptions())
          .pipe(tap(resp => {
            this.cookieService.delete('connect.sid');
          }),
            catchError(this.handleError));
    }

    handleStoryError = (error: HttpErrorResponse, caught: Observable<any>) => {
        this.storiesErrorEvent.emit();
        return of([]);
    }

    handleError(error: HttpErrorResponse) {
        console.log(JSON.stringify(error));
        return throwError(error);
    }

    public getBackendInfo() {
        const url = localStorage.getItem('url_backend');
        if (url && url !== 'undefined') {
            this.urlReceived = true;
            this.getBackendUrlEvent.emit();
        } else {
            this.http.get<any>(window.location.origin + '/backendInfo', this.getOptions()).subscribe((backendInfo) => {
                localStorage.setItem('url_backend', backendInfo.url);
                this.urlReceived = true;
                this.getBackendUrlEvent.emit();
            });
        }
    }

    public getStories(repository: string, token: string): Observable<Story[]> {
        let storytoken = token;
        if (!storytoken || storytoken === 'undefined') {
            storytoken = '';
        }
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<Story[]>(this.apiServer + '/github/stories/' + repository , this.getOptions())
            .pipe(tap(resp => {
                this.getStoriesEvent.emit(resp);
            }), catchError(this.handleStoryError));
    }

    public getStepTypes(): Observable<StepType[]> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<StepType[]>(this.apiServer + '/mongo/stepTypes', this.getOptions())
            .pipe(tap(resp => {
            }));
    }

    public addScenario(storyID: number): Observable<Scenario> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .get<any>(this.apiServer + '/mongo/scenario/add/' + storyID, this.getOptions())
            .pipe(tap(resp => {
                // console.log('Add new scenario in story ' + storyID + '!', resp)
            }));
    }
    
    public updateBackground(storyID: number, background: Background): Observable<Background> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/mongo/background/update/' + storyID, background, this.getOptions())
            .pipe(tap(resp => {
                // console.log('Update background for story ' + storyID )
            }));
    }

    public submitGithub(obj) {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/github/submitIssue/', obj, this.getOptions());
    }

    public updateScenario(storyID: number, scenario: Scenario): Observable<Story> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .post<any>(this.apiServer + '/mongo/scenario/update/' + storyID, scenario, this.getOptions())
            .pipe(tap(resp => {
                // console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
            }));
    }

    public deleteBackground(storyID: number): Observable<any>  {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .delete<any>(this.apiServer + '/mongo/background/delete/' + storyID, this.getOptions() )
            .pipe(tap(resp => {
                //  console.log('Delete background for story ' + storyID )
            }));
    }

    public deleteScenario(storyID: number, scenario: Scenario): Observable<Story>{
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/mongo/scenario/delete/' + storyID + '/' + scenario.scenario_id, this.getOptions())
            .pipe(tap(resp => {
                // console.log('Delete scenario ' + scenario.scenario_id + ' in story ' + storyID + '!', resp)
            }));
    }

    // demands testing from the server
    public runTests(storyID: number, scenarioID: number) {
        this.apiServer = localStorage.getItem('url_backend');

        if (scenarioID) {
            return this.http
                .get(this.apiServer + '/run/Scenario/' + storyID + '/' + scenarioID, {responseType: 'text'});
        }
        return this.http
            .get(this.apiServer + '/run/Feature/' + storyID, {responseType: 'text'});
    }

    isLoggedIn(): boolean {
        if (this.cookieService.check('connect.sid')) {
            return true;
        }
        return false;
    }

    getToken(): string {
        return localStorage.getItem('token');
    }


}