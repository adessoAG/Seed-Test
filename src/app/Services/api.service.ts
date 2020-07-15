import { Injectable } from '@angular/core';
import { tap, catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { EventEmitter } from '@angular/core';
import { Story } from '../model/Story';
import { Observable, throwError, of } from 'rxjs';
import { StepType } from '../model/StepType';
import { Scenario } from '../model/Scenario';
import { Background } from '../model/Background';
import { User } from '../model/User';
import { RepositoryContainer } from '../model/RepositoryContainer';

@Injectable({
    providedIn: 'root'
})

export class ApiService {

    public apiServer: string = localStorage.getItem('url_backend');
    public token: string;
    public urlReceived = false;
    public storiesErrorEvent = new EventEmitter();
    public getStoriesEvent = new EventEmitter();
    public getTokenEvent = new EventEmitter();
    public getBackendUrlEvent = new EventEmitter();
    public getRepositoriesEvent = new EventEmitter();
    public getProjectsEvent = new EventEmitter();
    public user;
    constructor(private http: HttpClient) {
    }

    public githubLogin(){
        let scope = 'repo'
        const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'; 
        let s = `${AUTHORIZE_URL}?scope=${scope}&client_id=${localStorage.getItem('clientId')}`;
        window.location.href = s;
    }

    public getOptions() {
        return { withCredentials: true};
    }

    getReport(reportName: string) {
        this.apiServer = localStorage.getItem('url_backend');
        if(this.apiServer){
            const str = this.apiServer + '/run/report/' + reportName;
            return this.http.get(str,  { responseType: 'text', withCredentials: true})
                .pipe(tap(resp => {}),
                catchError(this.handleError));
        }
    }

    public getProjectsFromJira() {
        this.apiServer = localStorage.getItem('url_backend');

        const str = this.apiServer + '/jira/projects/';

        return this.http.get<string[]>(str, this.getOptions())
            .pipe(tap(resp => {
                    this.getProjectsEvent.emit(resp);
            }),
                catchError(this.handleError));
    }

    public getRepositories(): Observable<RepositoryContainer[]> {
        this.apiServer = localStorage.getItem('url_backend');

        const str = this.apiServer + '/user/repositories';

        return this.http.get<RepositoryContainer[]>(str, this.getOptions())
          .pipe(tap(resp => {
            this.getRepositoriesEvent.emit(resp);
          }),
            catchError(this.handleError));
    }

    disconnectGithub(){
        let str = this.apiServer + '/github/disconnectGithub'

        return this.http.delete<any>(str, this.getOptions())
        .pipe(tap(resp => {
          //this.getStoriesEvent.emit(resp);
        }),
          catchError(this.handleError));
    }
  
    public loginGithubToken(login: string, id){
        const str = this.apiServer + '/user/githubLogin'
        let user = {login, id}

        return this.http.post<any>(str, user, this.getOptions())
          .pipe(tap(resp => {
            //this.getStoriesEvent.emit(resp);
          }),
            catchError(this.handleError));
    }

    public loginUser(email: string, password: string, stayLoggedIn: boolean): Observable<any> {
        const str = this.apiServer + '/user/login'

        let user;
        if(!email && !password){

        }else {
            user = {
                email, password, stayLoggedIn
            }
        }
        return this.http.post<string[]>(str, user, this.getOptions())
          .pipe(tap(resp => {
            localStorage.setItem('login', 'true')
            //this.getStoriesEvent.emit(resp);
          }),
            catchError(this.handleError));
    }

    public createRepository(email: string, name: string): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        console.log(this.apiServer);
        const body = {'email' : email, 'name' : name};
        return this.http
            .post<any>(this.apiServer + '/mongo/createRepository/', body, this.getOptions())
            .pipe(tap(resp => {
            }));
    }

    public createStory(title: string, description: string, repository: string): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        console.log(this.apiServer);
        const body = {'title' : title, 'description' : description, 'repo' : repository};
        return this.http
            .post<any>(this.apiServer + '/mongo/createStory/', body, this.getOptions())
            .pipe(tap(resp => {
            }));
    }

    logoutUser(){
        let str = this.apiServer + '/user/logout'
        localStorage.removeItem('login')
       return  this.http.get<string[]>(str, this.getOptions())
          .pipe(tap(resp => {
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

    public getBackendInfo(): Promise<any> {
        const url = localStorage.getItem('url_backend');
        const clientId = localStorage.getItem('clientId');

        if (url && url !== 'undefined' && clientId && clientId !== 'undefined') {
            this.urlReceived = true;
            this.getBackendUrlEvent.emit();
            return Promise.resolve(url);
        } else {
           return this.http.get<any>(window.location.origin + '/backendInfo', this.getOptions()).toPromise().then((backendInfo) => {
                localStorage.setItem('url_backend', backendInfo.url);
                localStorage.setItem('clientId', backendInfo.clientId);
                this.urlReceived = true;
                this.getBackendUrlEvent.emit();
            });
        }
    }


    public getStories(repository: RepositoryContainer): Observable<Story[]> {
        this.apiServer = localStorage.getItem('url_backend');
        let params;
        if (repository.source === 'github') {
            const repo = repository.value.split('/');
            params = { githubName: repo[0], repository: repo[1], source: repository.source};
        } else if (repository.source === 'jira') {
            params = {projectKey: repository.value, source: repository.source};
        } else if (repository.source === 'db') {
            params = {name: repository.value, source: repository.source};
        }

        return this.http
            .get<Story[]>(this.apiServer + '/user/stories/', {params, withCredentials: true})
            .pipe(tap(resp => {
                console.log('Resp');
                console.log(resp);
                this.getStoriesEvent.emit(resp);
            }), catchError(this.handleStoryError));
    }

    public getIssuesFromJira(projectKey: string) {
        this.apiServer = localStorage.getItem('url_backend');
        const str = this.apiServer + '/jira/issues/' + projectKey;
        console.log('Send');
        console.log(str);
        return this.http
            .get<Story[]>(str, this.getOptions())
            .pipe(tap(resp => {
                this.getStoriesEvent.emit(resp);
            }), catchError(this.handleStoryError));
    }
    public createJiraAccount(request) {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/jira/user/create/', request, this.getOptions());
    }

    public getStepTypes(): Observable<StepType[]> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<StepType[]>(this.apiServer + '/mongo/stepTypes', this.getOptions())
            .pipe(tap(resp => {
            }));
    }

    public registerUser(email:string, password:string): Observable<any> {
        const user = {email, password};
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/user/register', user)
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }

    public updateUser(userID: string, user: User): Observable<User> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<User>(this.apiServer + '/mongo/user/update/' + userID, user)
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }


    public deleteUser(userID: string) {
        this.apiServer = localStorage.getItem('url_backend');
        this.http
            .delete<any>(this.apiServer + '/mongo/user/delete/' + userID)
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }

    public mergeAccountGithub(userId: string, login: string, id: any) {
        let str = this.apiServer + '/user/mergeGithub'
        let obj = {userId, login, id}

        return this.http.post<any>(str, obj, this.getOptions())
        .pipe(tap(resp => {
          //this.getStoriesEvent.emit(resp);
        }),
          catchError(this.handleError));
    }

    public getUserData(): Observable<User> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<User>(this.apiServer + '/mongo/user/', this.getOptions())
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
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

    public deleteBackground(storyID: number): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .delete<any>(this.apiServer + '/mongo/background/delete/' + storyID, this.getOptions() )
            .pipe(tap(resp => {
                //  console.log('Delete background for story ' + storyID )
            }));
    }

    public deleteScenario(storyID: number, scenario: Scenario): Observable<Story> {
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
        let value = localStorage.getItem('repository');
        let source = localStorage.getItem('source');
        let params = {value, source}
        if (scenarioID) {
            return this.http
                .get(this.apiServer + '/run/Scenario/' + storyID + '/' + scenarioID, { responseType: 'text', withCredentials: true, params});
        }
        return this.http
            .get(this.apiServer + '/run/Feature/' + storyID, { responseType: 'text', withCredentials: true, params});
    }

    isLoggedIn(): boolean {
        //if (this.cookieService.check('connect.sid')) return true;
        //return false;
        if (localStorage.getItem('login')) return true;
        return false
    }
}
